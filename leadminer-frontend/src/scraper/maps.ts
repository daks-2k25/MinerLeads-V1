import { chromium } from "playwright-core";
import chromiumServerless from "@sparticuz/chromium";

export type OnStatus = (etapa: string, progresso: number) => void;

const EM_AMBIENTE_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

async function lancarBrowser() {
  console.log("[maps] Antes de chromium.launch()", {
    serverless: EM_AMBIENTE_SERVERLESS,
  });
  console.time("[perf] abrir navegador");

  const browser = EM_AMBIENTE_SERVERLESS
    ? await chromium.launch({
        args: chromiumServerless.args,
        executablePath: await chromiumServerless.executablePath(),
        headless: true,
      })
    : await chromium.launch({ headless: true });

  console.timeEnd("[perf] abrir navegador");
  console.log("[maps] Depois de chromium.launch()");

  return browser;
}

export async function buscarEmpresasMaps(
  termoBusca: string = "clínicas Curitiba",
  onStatus?: OnStatus
) {
  console.log("[maps] Início de buscarEmpresasMaps()", { termoBusca });

  console.log("[STATUS ENVIADO] Abrindo navegador");
  onStatus?.("Abrindo navegador", 5);
  const browser = await lancarBrowser();

  try {
    return await buscarEmpresasMapsComBrowser(browser, termoBusca, onStatus);
  } catch (erro) {
    await browser.close();
    throw erro;
  }
}

async function buscarEmpresasMapsComBrowser(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  termoBusca: string,
  onStatus?: OnStatus
) {
  console.log("[maps] Antes de browser.newPage()");
  console.time("[maps] browser.newPage()");
  const page = await browser.newPage();
  console.timeEnd("[maps] browser.newPage()");
  console.log("[maps] Depois de browser.newPage()");

  await page.route("**/*", (route) => {
    const tipo = route.request().resourceType();

    if (tipo === "image" || tipo === "media" || tipo === "font") {
      return route.abort();
    }

    return route.continue();
  });

  console.log("[STATUS ENVIADO] Abrindo Google Maps");
  onStatus?.("Abrindo Google Maps", 10);
  console.log("[maps] Antes de page.goto(https://maps.google.com)");
  console.time("[perf] abrir Google Maps");
  await page.goto("https://maps.google.com");
  console.timeEnd("[perf] abrir Google Maps");
  console.log("[maps] Depois de page.goto(https://maps.google.com)");

  console.log("[STATUS ENVIADO] Carregando Google Maps...");
  onStatus?.("Carregando Google Maps...", 13);

  await page.waitForTimeout(5000);

  console.log("[STATUS ENVIADO] Google Maps carregado");
  onStatus?.("Google Maps carregado", 16);

  const searchInput = page.locator('input[name="q"]');

  const searchInputCount = await searchInput.count();
  console.log("Campo de busca encontrado:", searchInputCount > 0);

  console.log("[STATUS ENVIADO] Pesquisando termo");
  onStatus?.("Pesquisando termo", 20);
  console.log("[maps] Antes da pesquisa no Google Maps", { termoBusca });
  console.time("[perf] pesquisar termo");

  await searchInput.fill(termoBusca);
  console.log("Texto preenchido com sucesso");

  await page.waitForTimeout(2000);

  await searchInput.press("Enter");
  console.log("Enter pressionado");

  console.log("[STATUS ENVIADO] Aguardando resultados...");
  onStatus?.("Aguardando resultados...", 25);

  try {
    await page.waitForURL("**/search/**");
  } catch {
    console.log("URL atual:", page.url());
    console.log("Valor atual do input:", await searchInput.inputValue());
  }

  await page.waitForLoadState("load");
  console.log(page.url());

  await page.waitForTimeout(5000);

  console.log("[STATUS ENVIADO] Resultados encontrados");
  onStatus?.("Resultados encontrados", 32);

  console.timeEnd("[perf] pesquisar termo");
  console.log("[maps] Depois da pesquisa no Google Maps");

  const linkCount = await page.locator("a").count();
  const buttonCount = await page.locator("button").count();
  const articleCount = await page.locator('[role="article"]').count();
  const mainCount = await page.locator('[role="main"]').count();

  console.log("Quantidade de <a>:", linkCount);
  console.log("Quantidade de <button>:", buttonCount);
  console.log('Quantidade de role="article":', articleCount);
  console.log('Quantidade de role="main":', mainCount);

  const resultsContainer = page.locator('[role="feed"]');

  const empresasMap = new Map<string, { nome: string | null; urlMaps: string | null }>();

  console.log("[STATUS ENVIADO] Coletando empresas");
  onStatus?.("Coletando empresas", 35);
  console.log("[maps] Antes de extrair lista de empresas");
  console.time("[perf] extrair lista de empresas");

  const coletarResultados = async () => {
    const cards = await page.$$eval('[role="article"]', (articles) =>
      articles.map((article) => {
        const link = article.querySelector("a");
        return {
          nome: link?.getAttribute("aria-label") ?? null,
          urlMaps: link?.getAttribute("href") ?? null,
        };
      })
    );

    for (const card of cards) {
      if (card.urlMaps && !empresasMap.has(card.urlMaps)) {
        empresasMap.set(card.urlMaps, card);
      }
    }
  };

  await coletarResultados();

  console.log("[maps] Antes de carregar resultados (scroll)");
  console.time("[perf] carregar resultados");

  for (let i = 0; i < 5; i++) {
    const iteracaoScroll = i + 1;
    const progressoScroll = 35 + Math.round((iteracaoScroll / 5) * 5);
    console.log(`[STATUS ENVIADO] Carregando mais resultados (${iteracaoScroll}/5)`);
    onStatus?.(`Carregando mais resultados (${iteracaoScroll}/5)`, progressoScroll);

    try {
      await resultsContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    } catch (erro) {
      console.log("[maps] Painel de resultados (role=feed) não encontrado ao rolar, interrompendo scroll:", erro);
      break;
    }

    await page.waitForTimeout(2000);

    await coletarResultados();
  }

  console.timeEnd("[perf] carregar resultados");
  console.log("[maps] Depois de carregar resultados (scroll)");

  const results = Array.from(empresasMap.values());

  console.timeEnd("[perf] extrair lista de empresas");
  console.log("[maps] Depois de extrair lista de empresas");

  console.log("[maps] Quantidade de empresas encontradas:", results.length);
  console.log(results);

  return { browser, page, results };
}
