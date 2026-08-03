import { Injectable } from '@nestjs/common';
import { Browser, Page, chromium } from 'playwright-core';
import chromiumServerless from '@sparticuz/chromium';
import { PrismaService } from '../prisma/prisma.service';
import { StartScraperDto } from './dto/start-scraper.dto';
import { ScrapedLead } from './interfaces/scraped-lead.interface';

interface CardResultado {
  nome: string | null;
  urlMaps: string | null;
}

// Ambientes onde não há um Chromium do Playwright instalado no sistema —
// precisam do binário empacotado do @sparticuz/chromium. O Render define
// RENDER=true automaticamente em todos os serviços.
const PRECISA_CHROMIUM_EMPACOTADO = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.RENDER,
);

// Etapa de resiliência: orçamento máximo por empresa (navegação + extração).
// Se estourar, a empresa é descartada e a pesquisa segue para a próxima.
const TIMEOUT_POR_EMPRESA_MS = 25000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  mensagemTimeout: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(mensagemTimeout)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer),
  );
}

@Injectable()
export class ScraperService {
  // Portado de src/scraper/service.ts (projeto antigo) — lock de concorrência
  // simples em memória, mesma limitação já conhecida (não protege múltiplas
  // réplicas do processo).
  private scrapingEmAndamento = false;

  constructor(private readonly prisma: PrismaService) {}

  // Etapa 1: só executa o scraping e retorna os leads coletados (com o
  // placeId extraído da URL).
  // Etapa 2: para cada placeId extraído, consulta o Prisma (findUnique,
  // somente leitura) para validar se ele já bate com um Lead existente —
  // isCached/cachedLeadId. Nenhuma escrita no banco (sem create/update/
  // upsert/getOrCreateLead) e nenhum uso de SearchHistory/Dashboard/cache.
  async start(dto: StartScraperDto): Promise<ScrapedLead[]> {
    if (this.scrapingEmAndamento) {
      throw new Error('Já existe um scraping em andamento');
    }

    this.scrapingEmAndamento = true;
    const inicioTotal = Date.now();

    try {
      const buscaComCidade = [dto.termoBusca, dto.bairro, dto.cidade]
        .filter(Boolean)
        .join(' ');

      // Só a abertura do Google Maps / busca inicial pode lançar exceção
      // global (buscarEmpresasMaps já fecha o browser e relança o erro) —
      // erro de uma empresa individual nunca chega até aqui.
      const { browser, page, results } =
        await this.buscarEmpresasMaps(buscaComCidade);
      const tempoListaMs = Date.now() - inicioTotal;

      const empresas: ScrapedLead[] = [];
      const inicioDetalhes = Date.now();

      try {
        for (const result of results) {
          if (!result.urlMaps) continue;

          try {
            const empresa = await this.processarEmpresa(page, result);
            if (empresa) empresas.push(empresa);
          } catch (erro) {
            console.error(
              `[scraper] Falha ao processar empresa "${result.nome ?? result.urlMaps}", ignorando e seguindo para a próxima:`,
              erro instanceof Error ? erro.message : erro,
            );
          }
        }
      } finally {
        try {
          await browser.close();
        } catch (erroFechamento) {
          console.error('Erro ao fechar o navegador:', erroFechamento);
        }
      }

      const tempoDetalhesMs = Date.now() - inicioDetalhes;
      const tempoTotalMs = Date.now() - inicioTotal;

      this.registrarLogDePerformance(dto, {
        empresasEncontradas: results.length,
        empresasProcessadas: empresas.length,
        cache: empresas.filter((e) => e.isCached).length,
        novos: empresas.filter((e) => !e.isCached).length,
        tempoListaMs,
        tempoDetalhesMs,
        tempoTotalMs,
      });

      return empresas;
    } finally {
      this.scrapingEmAndamento = false;
    }
  }

  // Processa uma única empresa com timeout (item 2) e retry de navegação
  // (item 3). Qualquer erro (inclusive timeout) propaga para o try/catch do
  // chamador em start(), que registra o log e segue para a próxima empresa
  // (item 1/5) — nunca interrompe a pesquisa inteira.
  private async processarEmpresa(
    page: Page,
    result: CardResultado,
  ): Promise<ScrapedLead | null> {
    if (!result.urlMaps) return null;

    const url = result.urlMaps;
    const placeId = this.extrairPlaceId(url);

    return withTimeout(
      (async () => {
        await this.navegarComRetry(page, url, result.nome);

        try {
          await page.waitForSelector('h1', { timeout: 15000 });
        } catch {
          // segue mesmo assim, best-effort (mesmo comportamento do
          // scraper antigo)
        }

        const companyData = await this.extrairDadosEmpresa(page);
        const { isCached, cachedLeadId } =
          await this.consultarCachePorPlaceId(placeId);

        return {
          placeId,
          nome: this.limparTexto(companyData.nome),
          telefone: this.limparTexto(companyData.telefone),
          website: this.limparTexto(companyData.website),
          endereco: this.limparTexto(companyData.endereco),
          urlMaps: page.url(),
          isCached,
          cachedLeadId,
        };
      })(),
      TIMEOUT_POR_EMPRESA_MS,
      `Timeout de ${TIMEOUT_POR_EMPRESA_MS / 1000}s ao processar "${result.nome ?? url}"`,
    );
  }

  // Item 3: em erro de navegação, tenta mais uma vez; se falhar de novo,
  // deixa o erro subir (a empresa é ignorada pelo chamador).
  private async navegarComRetry(
    page: Page,
    url: string,
    nomeEmpresa: string | null,
  ): Promise<void> {
    try {
      await page.goto(url);
    } catch (erroNavegacao) {
      console.warn(
        `[scraper] Erro de navegação ao abrir "${nomeEmpresa ?? url}", tentando novamente (1x):`,
        erroNavegacao instanceof Error ? erroNavegacao.message : erroNavegacao,
      );
      await page.goto(url);
    }
  }

  // Item 4: logs de performance da pesquisa completa.
  private registrarLogDePerformance(
    dto: StartScraperDto,
    dados: {
      empresasEncontradas: number;
      empresasProcessadas: number;
      cache: number;
      novos: number;
      tempoListaMs: number;
      tempoDetalhesMs: number;
      tempoTotalMs: number;
    },
  ): void {
    const emSegundos = (ms: number) => (ms / 1000).toFixed(1);
    const termoCompleto = [dto.termoBusca, dto.cidade].filter(Boolean).join(' ');

    console.log(
      [
        `[scraper] Pesquisa: ${termoCompleto}`,
        `[scraper] Empresas encontradas: ${dados.empresasEncontradas}`,
        `[scraper] Empresas processadas: ${dados.empresasProcessadas}`,
        `[scraper] Cache: ${dados.cache}`,
        `[scraper] Novos: ${dados.novos}`,
        `[scraper] Tempo lista: ${emSegundos(dados.tempoListaMs)}s`,
        `[scraper] Tempo detalhes: ${emSegundos(dados.tempoDetalhesMs)}s`,
        `[scraper] Tempo total: ${emSegundos(dados.tempoTotalMs)}s`,
      ].join('\n'),
    );
  }

  // Portado de src/scraper/service.ts
  private limparTexto(texto: string | null): string | null {
    if (!texto) return null;

    return texto.replace(/[^\p{L}\p{N}\s()+\-.,:/]/gu, '').trim();
  }

  // Prioridade 1: identificador ChIJ... do parâmetro !19s da URL (mesmo
  // formato do place_id da Places API). Fallback: CID interno !1s0x...:0x...
  private extrairPlaceId(url: string | null): string | null {
    if (!url) return null;

    const matchChIJ = url.match(/!19s(ChIJ[\w-]+)/);
    if (matchChIJ) return matchChIJ[1];

    const matchCid = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
    if (matchCid) return matchCid[1];

    return null;
  }

  // Etapa 2: apenas leitura (findUnique) para validar se o placeId extraído
  // do scraper já corresponde a um Lead existente no Prisma. Não cria, não
  // atualiza, não faz upsert — só consulta.
  private async consultarCachePorPlaceId(
    placeId: string | null,
  ): Promise<{ isCached: boolean; cachedLeadId: number | null }> {
    if (!placeId) {
      return { isCached: false, cachedLeadId: null };
    }

    const lead = await this.prisma.lead.findUnique({
      where: { placeId },
      select: { id: true },
    });

    return lead
      ? { isCached: true, cachedLeadId: lead.id }
      : { isCached: false, cachedLeadId: null };
  }

  // Portado de src/scraper/maps.ts
  private async lancarBrowser(): Promise<Browser> {
    return PRECISA_CHROMIUM_EMPACOTADO
      ? await chromium.launch({
          args: chromiumServerless.args,
          executablePath: await chromiumServerless.executablePath(),
          headless: true,
        })
      : await chromium.launch({ headless: true });
  }

  // Portado de src/scraper/maps.ts
  private async buscarEmpresasMaps(
    termoBusca: string,
  ): Promise<{ browser: Browser; page: Page; results: CardResultado[] }> {
    const browser = await this.lancarBrowser();

    try {
      return await this.buscarEmpresasMapsComBrowser(browser, termoBusca);
    } catch (erro) {
      await browser.close();
      throw erro;
    }
  }

  // Portado de src/scraper/maps.ts
  private async buscarEmpresasMapsComBrowser(
    browser: Browser,
    termoBusca: string,
  ): Promise<{ browser: Browser; page: Page; results: CardResultado[] }> {
    const page = await browser.newPage();

    await page.route('**/*', (route) => {
      const tipo = route.request().resourceType();

      if (tipo === 'image' || tipo === 'media' || tipo === 'font') {
        return route.abort();
      }

      return route.continue();
    });

    await page.goto('https://maps.google.com');
    await page.waitForTimeout(5000);

    const searchInput = page.locator('input[name="q"]');

    await searchInput.fill(termoBusca);
    await page.waitForTimeout(2000);
    await searchInput.press('Enter');

    try {
      await page.waitForURL('**/search/**');
    } catch {
      console.log('URL atual:', page.url());
    }

    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const resultsContainer = page.locator('[role="feed"]');
    const empresasMap = new Map<string, CardResultado>();

    const coletarResultados = async () => {
      const cards = await page.$$eval('[role="article"]', (articles) =>
        articles.map((article) => {
          const link = article.querySelector('a');
          return {
            nome: link?.getAttribute('aria-label') ?? null,
            urlMaps: link?.getAttribute('href') ?? null,
          };
        }),
      );

      for (const card of cards) {
        if (card.urlMaps && !empresasMap.has(card.urlMaps)) {
          empresasMap.set(card.urlMaps, card);
        }
      }
    };

    await coletarResultados();

    for (let i = 0; i < 5; i++) {
      try {
        await resultsContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
      } catch (erro) {
        console.log(
          '[scraper] Painel de resultados (role=feed) não encontrado ao rolar, interrompendo scroll:',
          erro,
        );
        break;
      }

      await page.waitForTimeout(2000);
      await coletarResultados();
    }

    const results = Array.from(empresasMap.values());

    return { browser, page, results };
  }

  // Portado de src/scraper/extract.ts
  private async extrairDadosEmpresa(page: Page): Promise<{
    nome: string | null;
    telefone: string | null;
    website: string | null;
    endereco: string | null;
  }> {
    return await page.evaluate(() => {
      const nome = document.querySelector('h1')?.textContent?.trim() ?? null;

      const phoneEl = document.querySelector('[data-item-id^="phone:"]');
      const telefone = phoneEl?.textContent?.trim() ?? null;

      const websiteEl = document.querySelector('[data-item-id="authority"]');
      const website = websiteEl?.textContent?.trim() ?? null;

      const addressEl = document.querySelector('[data-item-id="address"]');
      const endereco = addressEl?.textContent?.trim() ?? null;

      return { nome, telefone, website, endereco };
    });
  }
}
