import { Injectable } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import { Browser, BrowserContext, Page, chromium } from 'playwright-core';
import chromiumServerless from '@sparticuz/chromium';
import { LeadsService } from '../leads/leads.service';
import { SearchHistoryService } from '../search-history/search-history.service';
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
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.RENDER,
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

  constructor(
    private readonly leadsService: LeadsService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  // Etapa 1: cria o browser e busca a lista de empresas (busca/listagem usa
  // sua própria Page, fechada antes de devolver o resultado — ver
  // buscarListaDeEmpresas). Etapa 2: para cada empresa da lista, abre uma
  // Page de detalhe própria (ver extrairDetalheDeEmpresa) — nunca a mesma
  // Page usada na busca. Etapa 3: persiste cada empresa processada via
  // LeadsService.upsertByPlaceId (create ou update por placeId). Etapa 4:
  // registra a busca em SearchHistory e vincula os leads retornados via
  // SearchHistoryLead. Ainda sem uso do Dashboard.
  async start(dto: StartScraperDto): Promise<ScrapedLead[]> {
    // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após achar a causa do 500) ====
    console.log('[DIAG][scraper] start() - início do método', { dto });

    try {
      console.log(
        '[DIAG][scraper] validação de concorrência - verificando lock',
      );
      if (this.scrapingEmAndamento) {
        console.log(
          '[DIAG][scraper] validação de concorrência - BLOQUEADO (scraping já em andamento)',
        );
        throw new Error('Já existe um scraping em andamento');
      }
      console.log('[DIAG][scraper] validação de concorrência - liberado');

      this.scrapingEmAndamento = true;
      const inicioTotal = Date.now();

      try {
        const buscaComCidade = [dto.termoBusca, dto.bairro, dto.cidade]
          .filter(Boolean)
          .join(' ');

        console.log('[DIAG][scraper] antes de criar o navegador');
        const browser = await this.lancarBrowser();
        console.log('[DIAG][scraper] navegador criado com sucesso');

        // Contexto único, mantido aberto durante toda a execução (busca +
        // todas as empresas). Cada Page continua sendo aberta e fechada
        // individualmente (regra de páginas separadas preservada) — o que
        // muda é que elas nascem de context.newPage(), não de
        // browser.newPage(). browser.newPage() cria implicitamente um
        // BrowserContext descartável por chamada, que é destruído junto com
        // a Page ao fechá-la; isso deixava o browser sem nenhum target
        // registrado entre o fim da busca e o início de cada empresa (e
        // entre uma empresa e a próxima), janela em que o processo do
        // Chromium (em especial o binário empacotado do @sparticuz/chromium
        // usado em produção) pode se considerar ocioso e finalizar sozinho —
        // causando "Target page, context or browser has been closed" na
        // próxima chamada de newPage().
        const context = await browser.newContext();

        try {
          // buscarListaDeEmpresas() abre e fecha sua própria Page — se ela
          // lançar exceção, o finally abaixo ainda fecha o contexto/browser.
          console.log('[DIAG][scraper] antes de buscarListaDeEmpresas()', {
            buscaComCidade,
          });
          const results = await this.buscarListaDeEmpresas(
            context,
            buscaComCidade,
          );
          console.log(
            '[DIAG][scraper] depois de buscarListaDeEmpresas() - retornou com sucesso',
            {
              totalResultados: results.length,
            },
          );
          const tempoListaMs = Date.now() - inicioTotal;

          const empresas: ScrapedLead[] = [];
          const inicioDetalhes = Date.now();

          console.log('[DIAG][scraper] início do processamento das empresas', {
            totalEmpresas: results.length,
          });
          for (const result of results) {
            if (!result.urlMaps) continue;

            try {
              // extrairDetalheDeEmpresa() abre e fecha sua própria Page de
              // detalhe — nunca reaproveita a Page usada na busca/listagem.
              const empresa = await this.extrairDetalheDeEmpresa(
                context,
                result,
                dto,
              );
              if (empresa) empresas.push(empresa);
            } catch (erro) {
              console.error(
                `[scraper] Falha ao processar empresa "${result.nome ?? result.urlMaps}", ignorando e seguindo para a próxima:`,
                erro instanceof Error ? erro.message : erro,
              );
            }
          }
          console.log('[DIAG][scraper] fim do processamento das empresas', {
            processadas: empresas.length,
          });

          const tempoDetalhesMs = Date.now() - inicioDetalhes;
          const tempoTotalMs = Date.now() - inicioTotal;
          const cache = empresas.filter((e) => e.isCached).length;
          const novos = empresas.filter((e) => !e.isCached).length;

          this.registrarLogDePerformance(dto, {
            empresasEncontradas: results.length,
            empresasProcessadas: empresas.length,
            cache,
            novos,
            tempoListaMs,
            tempoDetalhesMs,
            tempoTotalMs,
          });

          console.log('[DIAG][scraper] antes de registrarHistorico()');
          await this.registrarHistorico(dto, empresas, novos, cache);
          console.log('[DIAG][scraper] depois de registrarHistorico()');

          return empresas;
        } finally {
          console.log('[DIAG][scraper] antes de fechar o contexto/navegador');
          try {
            await context.close();
          } catch (erroFechamentoContexto) {
            console.error(
              'Erro ao fechar o contexto do navegador:',
              erroFechamentoContexto,
            );
          }
          try {
            await browser.close();
            console.log('[DIAG][scraper] navegador fechado com sucesso');
          } catch (erroFechamento) {
            console.error('Erro ao fechar o navegador:', erroFechamento);
          }
        }
      } finally {
        this.scrapingEmAndamento = false;
      }
    } catch (error) {
      console.error(
        '[DIAG][scraper] EXCEÇÃO CAPTURADA em start() ==========================',
      );
      console.error('[DIAG][scraper] error:', error);
      console.error(
        '[DIAG][scraper] error.message:',
        error instanceof Error ? error.message : undefined,
      );
      console.error(
        '[DIAG][scraper] error.stack:',
        error instanceof Error ? error.stack : undefined,
      );
      console.error(
        '[DIAG][scraper] constructor.name:',
        (error as { constructor?: { name?: string } })?.constructor?.name,
      );
      throw error;
    }
    // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====
  }

  // Processa uma única empresa com timeout (item 2) e retry de navegação
  // (item 3). Qualquer erro (inclusive timeout) propaga para o try/catch do
  // chamador em start(), que registra o log e segue para a próxima empresa
  // (item 1/5) — nunca interrompe a pesquisa inteira.
  //
  // Regra de ciclo de vida de Page: esta função abre sua própria Page de
  // detalhe (context.newPage()) e SEMPRE a fecha no finally, sucesso ou
  // falha — nunca recebe nem reaproveita a Page usada na busca/listagem.
  // Recebe o BrowserContext (não o Browser) para que a Page nasça dentro do
  // contexto único mantido aberto por start() durante toda a execução — ver
  // comentário em start() sobre por que browser.newPage() isolado causava
  // "Target page, context or browser has been closed".
  private async extrairDetalheDeEmpresa(
    context: BrowserContext,
    result: CardResultado,
    dto: StartScraperDto,
  ): Promise<ScrapedLead | null> {
    if (!result.urlMaps) return null;

    const url = result.urlMaps;
    const placeId = this.extrairPlaceId(url);

    // Sem placeId não há chave para persistir nem para identificar o lead
    // depois — a empresa é descartada (não entra na resposta nem é salva).
    // Descartamos antes de abrir qualquer Page, para não gastar recurso com
    // algo que já sabemos que será ignorado.
    if (!placeId) {
      console.warn(
        `[scraper] Não foi possível extrair placeId de "${result.nome ?? url}", empresa descartada.`,
      );
      return null;
    }

    return withTimeout(
      (async () => {
        const page = await context.newPage();

        try {
          // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após identificar onde extrairDetalheDeEmpresa() trava) ====
          console.log('[DIAG][empresa] antes navegarComRetry', result.urlMaps);
          await this.navegarComRetry(page, url, result.nome);
          console.log('[DIAG][empresa] depois navegarComRetry');

          try {
            await page.waitForSelector('h1', { timeout: 15000 });
          } catch {
            // segue mesmo assim, best-effort (mesmo comportamento do
            // scraper antigo)
          }

          console.log('[DIAG][empresa] antes extrairDadosEmpresa');
          const companyData = await this.extrairDadosEmpresa(page);
          console.log('[DIAG][empresa] dados extraídos', companyData);
          const { isCached, cachedLeadId } =
            await this.consultarCachePorPlaceId(placeId);

          // Etapa 3: persiste a empresa e usa o Lead retornado (create ou
          // update por placeId) como resposta — garante id/cidade/categoria/
          // capturadoEm reais e iguais ao que está no banco, para leads novos
          // e já existentes.
          console.log('[DIAG][empresa] antes salvar lead');
          const leadPersistido = await this.leadsService.upsertByPlaceId({
            placeId,
            nome: this.limparTexto(companyData.nome),
            telefone: this.limparTexto(companyData.telefone),
            website: this.limparTexto(companyData.website),
            endereco: this.limparTexto(companyData.endereco),
            cidade: dto.cidade ?? '',
            categoria: dto.categoria ?? '',
            urlMaps: page.url(),
            capturadoEm: new Date(),
          });
          console.log('[DIAG][empresa] lead salvo');
          // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====

          return {
            id: leadPersistido.id,
            placeId: leadPersistido.placeId,
            nome: leadPersistido.nome,
            telefone: leadPersistido.telefone,
            website: leadPersistido.website,
            endereco: leadPersistido.endereco,
            cidade: leadPersistido.cidade,
            categoria: leadPersistido.categoria,
            urlMaps: leadPersistido.urlMaps,
            capturadoEm: leadPersistido.capturadoEm.toISOString(),
            isCached,
            cachedLeadId,
          };
        } finally {
          try {
            await page.close();
          } catch (erroFechamento) {
            console.error(
              '[scraper] Erro ao fechar a página de detalhe:',
              erroFechamento,
            );
          }
        }
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
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (erroNavegacao) {
      console.warn(
        `[scraper] Erro de navegação ao abrir "${nomeEmpresa ?? url}", tentando novamente (1x):`,
        erroNavegacao instanceof Error ? erroNavegacao.message : erroNavegacao,
      );
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
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
    const termoCompleto = [dto.termoBusca, dto.cidade]
      .filter(Boolean)
      .join(' ');

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

  // Etapa 4: registra a busca e vincula os leads retornados ao histórico.
  // Isolado num try/catch próprio de propósito: uma falha aqui (Postgres
  // fora do ar, violação de constraint etc.) não pode derrubar a resposta
  // nem desfazer os leads já persistidos por empresa em
  // extrairDetalheDeEmpresa — eles continuam salvos e são devolvidos ao
  // cliente normalmente.
  private async registrarHistorico(
    dto: StartScraperDto,
    empresas: ScrapedLead[],
    novos: number,
    cache: number,
  ): Promise<void> {
    try {
      const historico = await this.searchHistoryService.register({
        termoBusca: dto.termoBusca,
        cidade: dto.cidade,
        bairro: dto.bairro,
        categoria: dto.categoria,
        quantidadeLeads: empresas.length,
        quantidadeNovos: novos,
        quantidadeCache: cache,
      });

      await this.searchHistoryService.linkLeads(
        historico.id,
        empresas.map((empresa) => empresa.id),
      );
    } catch (erro) {
      console.error(
        '[scraper] Falha ao registrar histórico da busca (leads já salvos não são afetados):',
        erro instanceof Error ? erro.message : erro,
      );
    }
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

  // Etapa 2: apenas leitura (via LeadsService) para validar se o placeId
  // extraído do scraper já corresponde a um Lead existente. Não cria, não
  // atualiza, não faz upsert — só consulta.
  private async consultarCachePorPlaceId(
    placeId: string | null,
  ): Promise<{ isCached: boolean; cachedLeadId: number | null }> {
    if (!placeId) {
      return { isCached: false, cachedLeadId: null };
    }

    const lead = await this.leadsService.findByPlaceId(placeId);

    return lead
      ? { isCached: true, cachedLeadId: lead.id }
      : { isCached: false, cachedLeadId: null };
  }

  // Portado de src/scraper/maps.ts
  private async lancarBrowser(): Promise<Browser> {
    // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após achar a causa do 500) ====
    console.log(
      '[DIAG][scraper] abertura do navegador - antes de chromium.launch()',
      {
        PRECISA_CHROMIUM_EMPACOTADO,
      },
    );
    const browser = PRECISA_CHROMIUM_EMPACOTADO
      ? await chromium.launch({
          args: chromiumServerless.args,
          executablePath: await chromiumServerless.executablePath(),
          headless: true,
        })
      : await chromium.launch({ headless: true });
    console.log(
      '[DIAG][scraper] abertura do navegador - depois de chromium.launch(), sucesso',
    );
    return browser;
    // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====
  }

  // Faz polling de page.url() por até `timeoutMs` (checando a cada
  // `intervaloMs`) para detectar se o Google Maps redireciona client-side de
  // /maps/search/ para /maps/place/ depois da navegação inicial. Retorna
  // assim que /maps/place/ aparecer; se o tempo esgotar sem isso, devolve a
  // última URL observada (presumivelmente ainda em /maps/search/).
  private async aguardarEstabilizacaoUrl(
    page: Page,
    timeoutMs: number,
    intervaloMs: number,
  ): Promise<string> {
    const inicio = Date.now();
    let urlAtual = page.url();

    while (Date.now() - inicio < timeoutMs) {
      urlAtual = page.url();

      if (urlAtual.includes('/maps/place/')) {
        return urlAtual;
      }

      await page.waitForTimeout(intervaloMs);
    }

    return page.url();
  }

  // Best-effort: captura screenshot/HTML/URL/título da página atual para
  // descobrir o que o Google retornou quando role="feed" não aparece (DOM
  // mudou, tela de consentimento, CAPTCHA, etc.). Nunca lança — qualquer
  // falha na própria captura só é logada, sem afetar o fluxo do scraper.
  // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após identificar a causa do timeout de [role="feed"]) ====
  private async capturarDiagnosticoDeBloqueio(page: Page): Promise<void> {
    try {
      const urlAtual = page.url();
      const tituloAtual = await page.title();
      const html = await page.content();

      console.log(
        '[DIAG][scraper] role=feed não encontrado - URL atual:',
        urlAtual,
      );
      console.log(
        '[DIAG][scraper] role=feed não encontrado - título da página:',
        tituloAtual,
      );
      console.log(
        '[DIAG][scraper] role=feed não encontrado - tamanho do HTML capturado (caracteres):',
        html.length,
      );

      // Análise em memória do HTML capturado — não depende de acesso ao
      // filesystem do Render, só dos logs. Contagens são case-sensitive
      // (strings literais do HTML); a busca por indicadores de bloqueio
      // é case-insensitive (título/HTML podem variar maiúsculas).
      const htmlEmMinusculas = html.toLowerCase();
      const tituloEmMinusculas = tituloAtual.toLowerCase();

      const possiveisIndicadoresDeBloqueio = [
        'consent',
        'captcha',
        'unusual traffic',
      ].filter(
        (termo) =>
          tituloEmMinusculas.includes(termo) ||
          htmlEmMinusculas.includes(termo),
      );

      const contarOcorrencias = (texto: string, termo: string) =>
        texto.split(termo).length - 1;

      const resumoDiagnosticoRoleFeed = {
        urlAtual,
        tituloAtual,
        tamanhoHtml: html.length,
        possiveisIndicadoresDeBloqueio,
        ocorrencias: {
          'role="feed"': contarOcorrencias(html, 'role="feed"'),
          'role="article"': contarOcorrencias(html, 'role="article"'),
          'Não foi possível': contarOcorrencias(html, 'Não foi possível'),
          'Parece que você está fazendo muitas pesquisas': contarOcorrencias(
            html,
            'Parece que você está fazendo muitas pesquisas',
          ),
        },
      };

      console.log(
        '[DIAG][scraper] resumo do diagnóstico de role=feed:',
        resumoDiagnosticoRoleFeed,
      );

      await page.screenshot({ path: '/tmp/google-maps-debug.png' });
      await writeFile('/tmp/google-maps-debug.html', html);

      console.log(
        '[DIAG][scraper] role=feed não encontrado - screenshot e HTML salvos em /tmp/google-maps-debug.png e /tmp/google-maps-debug.html',
      );
    } catch (erroDiagnostico) {
      console.error(
        '[DIAG][scraper] Falha ao capturar diagnóstico (screenshot/HTML) do timeout de role=feed:',
        erroDiagnostico,
      );
    }
  }
  // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====

  // Portado de src/scraper/maps.ts — busca e coleta a lista de empresas
  // usando uma Page própria, criada e fechada inteiramente dentro desta
  // função (no finally, sucesso ou falha). Nunca devolve a Page para quem
  // chamou: busca/listagem e detalhe de cada empresa nunca compartilham a
  // mesma Page.
  private async buscarListaDeEmpresas(
    context: BrowserContext,
    termoBusca: string,
  ): Promise<CardResultado[]> {
    console.log(
      '[DIAG][scraper] criação da página de busca - antes de context.newPage()',
    );
    const page = await context.newPage();
    console.log(
      '[DIAG][scraper] criação da página de busca - depois de context.newPage(), sucesso',
    );

    try {
      await page.route('**/*', (route) => {
        const tipo = route.request().resourceType();

        if (tipo === 'image' || tipo === 'media' || tipo === 'font') {
          return route.abort();
        }

        return route.continue();
      });

      // Navegação direta para a URL de busca do Google Maps — elimina a
      // dependência do campo input[name="q"] da homepage (seletor sujeito a
      // mudança de DOM) e do fluxo fill()/press('Enter').
      const urlBusca = `https://www.google.com/maps/search/${encodeURIComponent(termoBusca)}`;

      await page.goto(urlBusca, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      console.log('[scraper] URL após busca direta:', page.url());

      // waitForURL(/\/maps\/(search|place)\//) não serve como validação aqui:
      // como urlBusca já É uma URL /maps/search/<query>, esse padrão já está
      // satisfeito desde o primeiro instante — antes da SPA do Google Maps
      // decidir, de forma assíncrona (depois do domcontentloaded), se redireciona
      // para /maps/place/. Uma espera fixa também não é confiável (o tempo que a
      // SPA leva para decidir varia). Em vez disso, fazemos polling de page.url()
      // até por 8s, parando imediatamente se ela mudar para /maps/place/; se o
      // tempo esgotar sem isso, seguimos com a última URL observada (ainda em
      // /maps/search/) para o fluxo de lista.
      await page.waitForLoadState('load');

      const urlAposBusca = await this.aguardarEstabilizacaoUrl(page, 8000, 300);
      console.log('[scraper] URL após busca (estabilizada):', urlAposBusca);

      let results: CardResultado[];

      if (urlAposBusca.includes('/maps/place/')) {
        console.log(
          '[scraper] Google Maps retornou direto para a página de detalhe (resultado único) em vez da lista de busca — tratando como lista de 1 empresa:',
          urlAposBusca,
        );

        results = [{ nome: null, urlMaps: urlAposBusca }];
      } else {
        // Verificação adicional: o Google pode redirecionar client-side para
        // /maps/place/ depois que já entramos no fluxo de lista (a URL só
        // "estabiliza" de fato depois de alguns segundos). Checamos de novo
        // antes de tocar em role="feed"/role="article" para não tentar coletar
        // uma lista que não existe mais.
        const urlAntesDaLista = await this.aguardarEstabilizacaoUrl(
          page,
          5000,
          300,
        );

        if (urlAntesDaLista.includes('/maps/place/')) {
          console.log(
            '[scraper] Google Maps redirecionou para a página de detalhe (resultado único) durante o fluxo de lista, antes de usar role="feed"/role="article" — tratando como lista de 1 empresa:',
            urlAntesDaLista,
          );

          results = [{ nome: null, urlMaps: urlAntesDaLista }];
        } else {
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

              await this.capturarDiagnosticoDeBloqueio(page);

              break;
            }

            await page.waitForTimeout(2000);
            await coletarResultados();
          }

          results = Array.from(empresasMap.values());
        }
      }

      return results;
    } finally {
      try {
        await page.close();
      } catch (erroFechamento) {
        console.error(
          '[scraper] Erro ao fechar a página de busca:',
          erroFechamento,
        );
      }
    }
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
