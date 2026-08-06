import { Injectable } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import {
  Browser,
  BrowserContext,
  Locator,
  Page,
  chromium,
} from 'playwright-core';
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
// Ajustado de 25s para 45s: o valor anterior gerava muitos falsos negativos
// ("Timeout de 25s ao processar empresa") no Render, ambiente mais lento
// que o local.
const TIMEOUT_POR_EMPRESA_MS = 45000;

// Processamento dos detalhes de cada empresa encontrada (start()): antes
// sequencial (uma empresa por vez), o que multiplicava o tempo total pelo
// número de empresas. Limite de concorrência controlado — nunca abre mais
// páginas simultâneas do que isso no mesmo BrowserContext, para não
// sobrecarregar o Chromium empacotado do Render.
const CONCORRENCIA_MAXIMA_PROCESSAMENTO_EMPRESAS = 3;

// Scroll da lista de resultados (buscarListaDeEmpresas): a auditoria
// mostrou que o Google Maps entrega os resultados por scroll infinito (sem
// botão de paginação) e que um loop fixo de 5 rolagens parava a coleta bem
// antes do feed esgotar (a lista continuava crescendo). Os limites abaixo
// substituem o loop fixo por uma condição de parada baseada no crescimento
// real da lista.
const SCROLL_LIMITE_MAXIMO_RESULTADOS = 100;
const SCROLL_MAX_TENTATIVAS_SEM_CRESCIMENTO = 3;
const SCROLL_TIMEOUT_MS = 60000;
const SCROLL_INTERVALO_ENTRE_RODADAS_MS = 2000;

// Promise.race() nunca cancela a promise perdedora — ela continua rodando
// até o fim, sozinha. `aoExpirar` é chamado exatamente quando o timer vence
// a corrida (nunca em caso de erro normal da própria `promise`), para que o
// chamador possa reagir de verdade ao timeout: interromper trabalho em
// andamento (ex.: fechar a Page) e sinalizar a si mesmo para não seguir
// adiante depois que já foi dado como desistido.
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  mensagemTimeout: string,
  aoExpirar?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      aoExpirar?.();
      reject(new Error(mensagemTimeout));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer),
  );
}

// Mapeamento explícito e pontual de termos de categoria no singular para o
// plural. Investigação empírica (35 buscas reais) mostrou que o Google Maps
// resolve termos de categoria no singular como busca por uma empresa
// específica — ex.: "clinica de estetica batel curitiba" bate quase
// literalmente com o nome de um negócio real e redirecionou direto para
// /maps/place/ em 4/4 tentativas — enquanto o plural do mesmo termo foi
// tratado como busca por categoria e retornou a lista normalmente em 4/4
// tentativas. Não é uma correção geral do redirecionamento: cobre só os
// termos abaixo; qualquer palavra fora deste mapeamento passa inalterada.
const MAPEAMENTO_SINGULAR_PARA_PLURAL: Record<string, string> = {
  clinica: 'clinicas',
  clínica: 'clínicas',
  salao: 'saloes',
  salão: 'salões',
  consultorio: 'consultorios',
  consultório: 'consultórios',
};

// Função isolada e pura (sem dependência de estado da classe): troca, palavra
// por palavra, os termos presentes em MAPEAMENTO_SINGULAR_PARA_PLURAL pelo
// plural correspondente (comparação case-insensitive). Palavras fora do
// mapeamento são devolvidas exatamente como vieram.
function normalizarTermoBusca(termoBusca: string): string {
  return termoBusca
    .split(' ')
    .map((palavra) => MAPEAMENTO_SINGULAR_PARA_PLURAL[palavra.toLowerCase()] ?? palavra)
    .join(' ');
}

// Função isolada e pura (sem dependência de estado da classe): processa
// `itens` chamando `processar` com no máximo `limiteConcorrencia` chamadas
// em andamento ao mesmo tempo — nunca ilimitado. Implementada como um
// pequeno worker pool: cada worker consome o próximo índice disponível de
// um cursor compartilhado (seguro em JS/Node por ser single-threaded, sem
// race condition) até a lista acabar. Erros de um item não derrubam os
// demais: `processar` é responsável por tratar seus próprios erros e
// retornar `null` nesse caso — só valores não nulos entram no resultado
// final.
async function processarComConcorrenciaLimitada<T, R>(
  itens: T[],
  limiteConcorrencia: number,
  processar: (item: T, indice: number) => Promise<R | null>,
): Promise<R[]> {
  const resultados: R[] = [];
  let proximoIndice = 0;

  async function worker(): Promise<void> {
    while (proximoIndice < itens.length) {
      const indiceAtual = proximoIndice;
      proximoIndice += 1;

      const resultado = await processar(itens[indiceAtual], indiceAtual);
      if (resultado) resultados.push(resultado);
    }
  }

  const workers = Array.from(
    { length: Math.min(limiteConcorrencia, itens.length) },
    () => worker(),
  );

  await Promise.all(workers);

  return resultados;
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
        // ==== ALTERAÇÃO TEMPORÁRIA DE TESTE (remover após validar a hipótese do contexto internacional do Chromium no Render — NÃO é a correção definitiva) ====
        // Testa se forçar locale/timezone/geolocation/Accept-Language para
        // Brasil muda a resolução regional do Google Maps no Render (hoje
        // resolve em en-US/UTC, com botão "Search" em vez de "Pesquisar", e
        // ocasionalmente cai direto em /maps/place/). Geolocation aponta
        // para Curitiba/Batel — mesma região usada nas buscas de teste.
        const context = await browser.newContext({
          locale: 'pt-BR',
          timezoneId: 'America/Sao_Paulo',
          geolocation: { latitude: -25.4411, longitude: -49.276 },
          permissions: ['geolocation'],
          extraHTTPHeaders: {
            'Accept-Language': 'pt-BR',
          },
        });
        // ==== FIM DA ALTERAÇÃO TEMPORÁRIA DE TESTE ====

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

          const inicioDetalhes = Date.now();

          console.log('[DIAG][scraper] início do processamento das empresas', {
            totalEmpresas: results.length,
          });
          console.log(
            '[inicio-processamento-paralelo] quantidade total de empresas:',
            results.length,
          );

          const empresas = await processarComConcorrenciaLimitada<
            CardResultado,
            ScrapedLead
          >(
            results,
            CONCORRENCIA_MAXIMA_PROCESSAMENTO_EMPRESAS,
            async (result) => {
              if (!result.urlMaps) return null;

              const nomeEmpresa = result.nome ?? result.urlMaps;
              const inicioEmpresa = Date.now();
              console.log('[empresa-iniciada] nome:', nomeEmpresa);

              try {
                // extrairDetalheDeEmpresa() abre e fecha sua própria Page de
                // detalhe — nunca reaproveita a Page usada na busca/listagem.
                const empresa = await this.extrairDetalheDeEmpresa(
                  context,
                  result,
                  dto,
                );

                console.log(
                  '[empresa-finalizada] nome:',
                  nomeEmpresa,
                  'tempoGastoMs:',
                  Date.now() - inicioEmpresa,
                );

                return empresa;
              } catch (erro) {
                console.error(
                  `[scraper] Falha ao processar empresa "${nomeEmpresa}", ignorando e seguindo para a próxima:`,
                  erro instanceof Error ? erro.message : erro,
                );
                console.log(
                  '[empresa-finalizada] nome:',
                  nomeEmpresa,
                  'tempoGastoMs:',
                  Date.now() - inicioEmpresa,
                  '(com erro)',
                );

                return null;
              }
            },
          );

          console.log('[DIAG][scraper] fim do processamento das empresas', {
            processadas: empresas.length,
          });

          const tempoDetalhesMs = Date.now() - inicioDetalhes;

          console.log('[resumo-processamento] empresas encontradas:', results.length);
          console.log('[resumo-processamento] empresas processadas:', empresas.length);
          console.log(
            '[resumo-processamento] tempo total de detalhes (ms):',
            tempoDetalhesMs,
          );
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

    const page = await context.newPage();
    // Setado por aoExpirar quando o timeout vence a corrida do
    // withTimeout() abaixo. A operação abandonada (que continua rodando em
    // segundo plano — Promise.race não a cancela) consulta essa flag nos
    // pontos de checagem para parar de avançar em vez de terminar sozinha
    // depois que start() já contou esta empresa como falha.
    let expirou = false;

    try {
      return await withTimeout(
        (async () => {
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
          if (expirou) return null;
          console.log('[DIAG][empresa] dados extraídos', companyData);

          const { isCached, cachedLeadId } =
            await this.consultarCachePorPlaceId(placeId);
          if (expirou) return null;

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
          if (expirou) return null;
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
        })(),
        TIMEOUT_POR_EMPRESA_MS,
        `Timeout de ${TIMEOUT_POR_EMPRESA_MS / 1000}s ao processar "${result.nome ?? url}"`,
        () => {
          expirou = true;
        },
      );
    } finally {
      // Fecha a página assim que a corrida se resolve (sucesso, erro ou
      // timeout) — não espera a operação abandonada terminar por conta
      // própria. Isso interrompe de fato qualquer chamada Playwright em
      // andamento nela (navegarComRetry/waitForSelector/extrairDadosEmpresa
      // passam a rejeitar com a página fechada), em vez de deixá-la seguir
      // rodando sozinha até o fim.
      try {
        await page.close();
      } catch (erroFechamento) {
        console.error(
          '[scraper] Erro ao fechar a página de detalhe:',
          erroFechamento,
        );
      }
    }
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

  // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após entender por que a lista retorna poucos resultados, ex.: 6) ====
  // Mede, em cada rodada de coleta/scroll, como o Google Maps está
  // entregando os resultados: presença de role="feed", quantidade de
  // role="article", textos/URLs dos primeiros 10, se há scroll disponível
  // (scrollHeight vs clientHeight/scrollTop) e se existe algum indicador de
  // "carregar mais"/spinner de loading dentro do feed. Só lê o estado
  // atual — nunca altera a lógica real de coleta/scroll (coletarResultados,
  // o loop de 5 iterações, o dedup por URL). Nunca lança: qualquer falha na
  // própria captura só é logada, sem afetar o fluxo de busca.
  private async capturarDiagnosticoListaResultados(
    page: Page,
    etiqueta: string,
  ): Promise<void> {
    try {
      const diagnostico = await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        const articles = Array.from(document.querySelectorAll('[role="article"]'));

        const primeiros10 = articles.slice(0, 10).map((article) => {
          const link = article.querySelector('a');
          return {
            texto: link?.getAttribute('aria-label') ?? null,
            url: link?.getAttribute('href') ?? null,
          };
        });

        const scrollInfo = feed
          ? {
              scrollTop: feed.scrollTop,
              scrollHeight: feed.scrollHeight,
              clientHeight: feed.clientHeight,
              temMaisParaRolar:
                feed.scrollHeight > feed.clientHeight + feed.scrollTop + 5,
            }
          : null;

        // Heurística ampla, só pra diagnóstico: procura qualquer indicador
        // textual de carregamento/paginação dentro do feed.
        const indicadorCarregamento = feed
          ? Array.from(feed.querySelectorAll('*')).some((el) => {
              const texto = (el.textContent || '').toLowerCase();
              return (
                texto.includes('carregando') ||
                texto.includes('mais resultados') ||
                texto.includes('carregar mais') ||
                el.getAttribute('role') === 'progressbar'
              );
            })
          : false;

        return {
          feedPresente: Boolean(feed),
          totalArticles: articles.length,
          primeiros10,
          scrollInfo,
          indicadorCarregamento,
        };
      });

      console.log(
        `[DIAG][lista-resultados][${etiqueta}] role="feed" presente:`,
        diagnostico.feedPresente,
      );
      console.log(
        `[DIAG][lista-resultados][${etiqueta}] quantidade de role="article":`,
        diagnostico.totalArticles,
      );
      console.log(
        `[DIAG][lista-resultados][${etiqueta}] primeiros 10 resultados (texto/url):`,
        diagnostico.primeiros10,
      );
      console.log(
        `[DIAG][lista-resultados][${etiqueta}] info de scroll (scrollTop/scrollHeight/clientHeight/temMaisParaRolar):`,
        diagnostico.scrollInfo,
      );
      console.log(
        `[DIAG][lista-resultados][${etiqueta}] indicador de "carregar mais"/loading detectado:`,
        diagnostico.indicadorCarregamento,
      );
    } catch (erroDiagnosticoLista) {
      console.error(
        `[DIAG][lista-resultados][${etiqueta}] Falha ao capturar diagnóstico:`,
        erroDiagnosticoLista,
      );
    }
  }
  // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====

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

  // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após confirmar/eliminar a hipótese do autocomplete) ====
  // Investiga se o Google Maps tem uma sugestão de autocomplete
  // pré-destacada no instante exato antes do Enter — se houver, o Enter
  // pode estar aceitando essa sugestão em vez de fazer a busca textual
  // literal do campo, o que explicaria o redirecionamento direto para
  // /maps/place/. Só lê o estado atual do DOM/input — nunca clica, nunca
  // digita, nunca altera nada. Nunca lança: qualquer falha na própria
  // captura só é logada, sem afetar o fluxo de busca.
  private async capturarDiagnosticoAutocomplete(
    page: Page,
    searchInput: Locator,
  ): Promise<void> {
    try {
      const inputValue = await searchInput.inputValue();

      const estadoDom = await page.evaluate(() => {
        const input = document.querySelector('input[name="q"]');

        const aria = input
          ? {
              ariaExpanded: input.getAttribute('aria-expanded'),
              ariaActivedescendant: input.getAttribute('aria-activedescendant'),
              ariaControls: input.getAttribute('aria-controls'),
              role: input.getAttribute('role'),
            }
          : null;

        const candidatos = Array.from(
          document.querySelectorAll('[role="option"], [aria-selected]'),
        );

        const suggestions = candidatos.map((el) => ({
          texto: el.textContent?.trim().slice(0, 200) ?? null,
          id: el.getAttribute('id'),
          role: el.getAttribute('role'),
          ariaSelected: el.getAttribute('aria-selected'),
          tag: el.tagName,
        }));

        const activeDescendantId =
          input?.getAttribute('aria-activedescendant') ?? null;
        const activeDescendantEl = activeDescendantId
          ? document.getElementById(activeDescendantId)
          : null;

        const activeItem = activeDescendantEl
          ? {
              origem: 'aria-activedescendant',
              id: activeDescendantEl.getAttribute('id'),
              texto:
                activeDescendantEl.textContent?.trim().slice(0, 200) ?? null,
            }
          : (suggestions.find((s) => s.ariaSelected === 'true') ?? null);

        const listbox = document.querySelector('[role="listbox"]');

        return {
          aria,
          suggestions,
          activeItem,
          dropdown: {
            listboxPresente: Boolean(listbox),
            outerHtmlTrecho: listbox?.outerHTML.slice(0, 1000) ?? null,
          },
        };
      });

      const screenshotPath = '/tmp/autocomplete-before-enter.png';
      await page.screenshot({ path: screenshotPath });

      console.log('[AUTOCOMPLETE DEBUG] input:', inputValue);
      console.log('[AUTOCOMPLETE DEBUG] aria:', estadoDom.aria);
      console.log('[AUTOCOMPLETE DEBUG] suggestions:', {
        total: estadoDom.suggestions.length,
        itens: estadoDom.suggestions,
      });
      console.log('[AUTOCOMPLETE DEBUG] active item:', estadoDom.activeItem);
      console.log('[AUTOCOMPLETE DEBUG] dropdown dom:', estadoDom.dropdown);
      console.log('[AUTOCOMPLETE DEBUG] screenshot:', screenshotPath);
    } catch (erroDiagnosticoAutocomplete) {
      console.error(
        '[AUTOCOMPLETE DEBUG] Falha ao capturar diagnóstico de autocomplete:',
        erroDiagnosticoAutocomplete,
      );
    }
  }
  // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====

  // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após identificar por que button[aria-label="Pesquisar"] não é encontrado no Render) ====
  // Em produção (Render) o fallback para Enter foi acionado, indicando que
  // button[aria-label="Pesquisar"] não foi localizado a tempo nesse
  // ambiente. Antes de mexer na lógica do clique/fallback, lista todos os
  // <button> visíveis no DOM nesse momento e verifica explicitamente a
  // presença do seletor usado, para descobrir se o botão não existe, existe
  // com outro aria-label, ou só ainda não estava visível. Só lê o estado
  // atual — nunca clica, nunca digita. Nunca lança: qualquer falha na
  // própria captura só é logada, sem afetar o fluxo de busca.
  private async capturarDiagnosticoBotaoPesquisa(page: Page): Promise<void> {
    try {
      const diagnostico = await page.evaluate(() => {
        function estaVisivel(el: Element): boolean {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            (el as HTMLElement).offsetParent !== null
          );
        }

        function estaHabilitado(el: Element): boolean {
          const desabilitadoPorAtributo = el.hasAttribute('disabled');
          const ariaDisabled = el.getAttribute('aria-disabled');
          return !desabilitadoPorAtributo && ariaDisabled !== 'true';
        }

        function boundingBoxDe(el: Element) {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }

        function descreverCandidato(el: Element, origem: string) {
          return {
            origem,
            tag: el.tagName,
            ariaLabel: el.getAttribute('aria-label'),
            texto: el.textContent?.trim().slice(0, 100) || null,
            classe: (el as HTMLElement).className || null,
            jsaction: el.getAttribute('jsaction'),
            visivel: estaVisivel(el),
            habilitado: estaHabilitado(el),
            boundingBox: boundingBoxDe(el),
          };
        }

        const botoesVisiveis = Array.from(document.querySelectorAll('button'))
          .filter(estaVisivel)
          .map((el) => ({
            ariaLabel: el.getAttribute('aria-label'),
            texto: el.textContent?.trim().slice(0, 100) || null,
            classe: el.className || null,
          }));

        const candidatosPesquisar = Array.from(
          document.querySelectorAll('button[aria-label="Pesquisar"]'),
        );
        const candidatosSearch = Array.from(
          document.querySelectorAll('button[aria-label="Search"]'),
        );
        const candidatosJsaction = Array.from(
          document.querySelectorAll('[jsaction]'),
        ).filter((el) =>
          (el.getAttribute('jsaction') ?? '').includes('omnibox.search'),
        );

        const candidatos = [
          ...candidatosPesquisar.map((el) =>
            descreverCandidato(el, 'button[aria-label="Pesquisar"]'),
          ),
          ...candidatosSearch.map((el) =>
            descreverCandidato(el, 'button[aria-label="Search"]'),
          ),
          ...candidatosJsaction.map((el) =>
            descreverCandidato(el, 'jsaction contém "omnibox.search"'),
          ),
        ];

        return {
          botoesVisiveis,
          contagem: {
            ariaLabelPesquisar: candidatosPesquisar.length,
            ariaLabelSearch: candidatosSearch.length,
            jsactionOmniboxSearch: candidatosJsaction.length,
          },
          candidatos,
        };
      });

      const labelsDisponiveis = diagnostico.botoesVisiveis
        .map((botao) => botao.ariaLabel)
        .filter((label): label is string => Boolean(label));

      console.log(
        '[DIAG][botao-pesquisa] total de botões visíveis:',
        diagnostico.botoesVisiveis.length,
      );
      console.log(
        '[DIAG][botao-pesquisa] botões visíveis:',
        diagnostico.botoesVisiveis,
      );
      console.log(
        '[DIAG][botao-pesquisa] labels (aria-label) disponíveis:',
        labelsDisponiveis,
      );
      console.log(
        '[DIAG][botao-pesquisa] quantidade de button[aria-label="Pesquisar"] encontrados:',
        diagnostico.contagem.ariaLabelPesquisar,
      );
      console.log(
        '[DIAG][botao-pesquisa] quantidade de button[aria-label="Search"] encontrados:',
        diagnostico.contagem.ariaLabelSearch,
      );
      console.log(
        '[DIAG][botao-pesquisa] quantidade de elementos com jsaction contendo "omnibox.search":',
        diagnostico.contagem.jsactionOmniboxSearch,
      );
      console.log(
        '[DIAG][botao-pesquisa] detalhes dos candidatos encontrados (visível/habilitado/boundingBox):',
        diagnostico.candidatos,
      );
    } catch (erroDiagnosticoBotao) {
      console.error(
        '[DIAG][botao-pesquisa] Falha ao capturar diagnóstico do botão de pesquisa:',
        erroDiagnosticoBotao,
      );
    }
  }
  // ==== FIM DA INSTRUMENTAÇÃO TEMPORÁRIA ====

  // ==== INSTRUMENTAÇÃO TEMPORÁRIA DE DIAGNÓSTICO (remover após entender por que o Google Maps às vezes resolve direto para /maps/place/ no Render) ====
  // Investiga o contexto inicial (idioma, timezone, geolocalização,
  // user-agent, coordenadas na URL etc.) que o Google Maps recebe assim que
  // a página abre no Render, antes de qualquer interação (fill/click/Enter).
  // Hipótese em investigação: esse contexto pode influenciar a decisão do
  // Google de resolver a busca direto para /maps/place/ em vez de
  // /maps/search/. Só lê o estado atual — nunca altera BrowserContext,
  // geolocation, locale, timezone, user-agent nem a lógica de busca. Nunca
  // lança: qualquer falha na própria captura só é logada, sem afetar o
  // fluxo de busca.
  private async capturarDiagnosticoContextoInicial(
    page: Page,
    urlImediatamenteAposAbrir: string,
  ): Promise<void> {
    try {
      console.log(
        '[DIAG][contexto-inicial] URL imediatamente após abrir a página:',
        urlImediatamenteAposAbrir,
      );

      try {
        await page.waitForLoadState('load', { timeout: 10000 });
      } catch (erroWaitLoad) {
        console.warn(
          '[DIAG][contexto-inicial] waitForLoadState("load") não completou a tempo (best-effort, seguindo mesmo assim):',
          erroWaitLoad instanceof Error ? erroWaitLoad.message : erroWaitLoad,
        );
      }

      const urlAposCarregamentoCompleto = page.url();
      const titulo = await page.title();

      const infoNavegador = await page.evaluate(() => {
        let timeZone: string | null = null;
        try {
          timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          timeZone = null;
        }

        return {
          navigatorLanguage: navigator.language,
          navigatorLanguages: navigator.languages
            ? Array.from(navigator.languages)
            : null,
          timeZone,
          navigatorPlatform: navigator.platform,
          navigatorUserAgent: navigator.userAgent,
          documentLang: document.documentElement.lang || null,
          geolocationDisponivel: 'geolocation' in navigator,
        };
      });

      const matchCoordenadas = urlAposCarregamentoCompleto.match(
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      );
      const coordenadasNaUrl = matchCoordenadas
        ? { lat: Number(matchCoordenadas[1]), lng: Number(matchCoordenadas[2]) }
        : null;

      console.log(
        '[DIAG][contexto-inicial] URL após o carregamento completo:',
        urlAposCarregamentoCompleto,
      );
      console.log('[DIAG][contexto-inicial] título da página:', titulo);
      console.log(
        '[DIAG][contexto-inicial] navigator.language:',
        infoNavegador.navigatorLanguage,
      );
      console.log(
        '[DIAG][contexto-inicial] navigator.languages:',
        infoNavegador.navigatorLanguages,
      );
      console.log(
        '[DIAG][contexto-inicial] Intl.DateTimeFormat().resolvedOptions().timeZone:',
        infoNavegador.timeZone,
      );
      console.log(
        '[DIAG][contexto-inicial] navigator.platform:',
        infoNavegador.navigatorPlatform,
      );
      console.log(
        '[DIAG][contexto-inicial] navigator.userAgent:',
        infoNavegador.navigatorUserAgent,
      );
      console.log(
        '[DIAG][contexto-inicial] document.documentElement.lang:',
        infoNavegador.documentLang,
      );
      console.log(
        '[DIAG][contexto-inicial] navigator.geolocation disponível:',
        infoNavegador.geolocationDisponivel,
      );
      console.log(
        '[DIAG][contexto-inicial] coordenadas encontradas na URL (@lat,long):',
        coordenadasNaUrl,
      );
    } catch (erroDiagnosticoContexto) {
      console.error(
        '[DIAG][contexto-inicial] Falha ao capturar diagnóstico de contexto inicial:',
        erroDiagnosticoContexto,
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
    const termoNormalizado = normalizarTermoBusca(termoBusca);
    console.log('[DIAG][normalizacao-termo] termo original:', termoBusca);
    console.log(
      '[DIAG][normalizacao-termo] termo normalizado:',
      termoNormalizado,
    );

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

      // Busca via interface do Google Maps: abre a homepage do Maps, preenche
      // o campo de pesquisa e envia Enter — substitui completamente a
      // navegação direta para /maps/search/<query>, que se mostrou pouco
      // confiável para retornar a lista de resultados.
      await page.goto('https://www.google.com/maps', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      await this.capturarDiagnosticoContextoInicial(page, page.url());

      await page.waitForTimeout(5000);

      const searchInput = page.locator('input[name="q"]');

      console.log(
        '[DIAG][normalizacao-termo] busca final enviada ao Google Maps:',
        termoNormalizado,
      );
      await searchInput.fill(termoNormalizado);
      await page.waitForTimeout(2000);

      await this.capturarDiagnosticoAutocomplete(page, searchInput);

      // Investigação prévia (10x Enter vs 10x clique real) mostrou que
      // searchInput.press('Enter') pode aceitar uma sugestão de autocomplete
      // pré-destacada e pular direto para /maps/place/ (1/10 execuções),
      // enquanto o clique no botão real de pesquisa da omnibox não
      // apresentou esse comportamento em 10/10 execuções. Fallback para
      // Enter cobre o caso do botão não estar disponível no DOM.
      //
      // Diagnóstico em produção (Render) mostrou que o botão existe com
      // aria-label="Search" (não "Pesquisar") nesse ambiente — o Maps
      // resolveu em inglês ali. O seletor aceita os dois rótulos.
      await this.capturarDiagnosticoBotaoPesquisa(page);

      const botaoPesquisa = page.locator(
        'button[aria-label="Pesquisar"], button[aria-label="Search"]',
      );
      try {
        await botaoPesquisa.waitFor({ state: 'visible', timeout: 5000 });
        await botaoPesquisa.click();
      } catch {
        await searchInput.press('Enter');
      }

      console.log('[scraper] Busca enviada via interface:', termoBusca);

      // Mesmo com a busca sendo enviada pela interface (clique no botão de
      // pesquisa, com fallback para Enter), o Google Maps ainda pode navegar
      // para um de dois destinos possíveis, e
      // essa decisão pode acontecer de forma assíncrona depois do evento
      // "load" — por isso continuamos usando polling de page.url() (em vez de
      // assumir que a URL já estabilizou assim que "load" dispara) por até
      // 8s, parando imediatamente se ela mudar para /maps/place/; se o
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

          await this.capturarDiagnosticoListaResultados(
            page,
            'antes-da-coleta-inicial',
          );

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

          await this.capturarDiagnosticoListaResultados(
            page,
            'apos-coleta-inicial',
          );

          // Substitui o antigo loop fixo de 5 rolagens: continua rolando
          // enquanto a lista estiver de fato crescendo, e para por uma de
          // três condições — sem crescimento por algumas rodadas seguidas
          // (feed provavelmente esgotado), limite máximo de resultados
          // atingido, ou timeout de segurança. Isso acompanha o
          // comportamento real do scroll infinito do Maps em vez de supor
          // um número fixo de rolagens.
          const inicioScroll = Date.now();
          let tentativasSemCrescimento = 0;
          let rodada = 0;
          let motivoParada = 'loop encerrado sem condição de parada explícita';

          while (true) {
            rodada++;
            const resultadosAntes = empresasMap.size;

            console.log('[DIAG][scroll] rodada:', rodada);
            console.log('[DIAG][scroll] resultados antes:', resultadosAntes);

            if (resultadosAntes >= SCROLL_LIMITE_MAXIMO_RESULTADOS) {
              motivoParada = `limite máximo de ${SCROLL_LIMITE_MAXIMO_RESULTADOS} resultados atingido`;
              break;
            }

            if (Date.now() - inicioScroll >= SCROLL_TIMEOUT_MS) {
              motivoParada = `timeout de segurança de ${SCROLL_TIMEOUT_MS / 1000}s atingido`;
              break;
            }

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

              motivoParada = 'role="feed" não encontrado ao tentar rolar';
              break;
            }

            await page.waitForTimeout(SCROLL_INTERVALO_ENTRE_RODADAS_MS);
            await coletarResultados();

            const resultadosDepois = empresasMap.size;
            console.log('[DIAG][scroll] resultados depois:', resultadosDepois);

            await this.capturarDiagnosticoListaResultados(
              page,
              `apos-scroll-${rodada}`,
            );

            if (resultadosDepois > resultadosAntes) {
              tentativasSemCrescimento = 0;
            } else {
              tentativasSemCrescimento++;

              if (tentativasSemCrescimento >= SCROLL_MAX_TENTATIVAS_SEM_CRESCIMENTO) {
                motivoParada = `sem crescimento por ${SCROLL_MAX_TENTATIVAS_SEM_CRESCIMENTO} rodadas consecutivas`;
                break;
              }
            }
          }

          const duracaoScrollMs = Date.now() - inicioScroll;
          console.log('[DIAG][scroll] motivo da parada:', motivoParada);
          console.log('[DIAG][scroll] total de rodadas:', rodada);
          console.log('[DIAG][scroll] duração total do scroll (ms):', duracaoScrollMs);

          await this.capturarDiagnosticoListaResultados(page, 'final');

          console.log(
            '[DIAG][lista-resultados][final] total de empresas únicas no empresasMap (após dedup por URL):',
            empresasMap.size,
          );

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
