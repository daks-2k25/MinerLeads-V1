import { buscarEmpresasMaps, type OnStatus } from "./maps";
import { extrairDadosEmpresa } from "./extract";
import { inserirLead } from "../storage/leads";

function limparTexto(texto: string | null) {
  if (!texto) return null;

  return texto
    .replace(/[^\p{L}\p{N}\s()+\-.,:/]/gu, "")
    .trim();
}

let scrapingEmAndamento = false;

export async function executarScraping(
  termoBusca: string,
  cidade: string,
  bairro: string,
  categoria: string,
  onStatus?: OnStatus
) {
  console.log("[executarScraping] Início de executarScraping()", {
    termoBusca,
    cidade,
    bairro,
    categoria,
  });

  if (scrapingEmAndamento) {
    throw new Error("Já existe um scraping em andamento");
  }

  scrapingEmAndamento = true;
  console.time("[perf] executarScraping() completo");

  try {
    console.log("[STATUS ENVIADO] Iniciando scraper");
    onStatus?.("Iniciando scraper", 0);

    const buscaComCidade = [termoBusca, bairro, cidade].filter(Boolean).join(" ");

    console.log("[executarScraping] Antes de buscarEmpresasMaps()");
    console.time("[executarScraping] buscarEmpresasMaps()");
    const { browser, page, results } = await buscarEmpresasMaps(buscaComCidade, onStatus);
    console.timeEnd("[executarScraping] buscarEmpresasMaps()");
    console.log("[executarScraping] Depois de buscarEmpresasMaps()");

    console.log("[perf] Quantidade de empresas encontradas:", results.length);

    const empresas = [];
    const temposPorEmpresa: number[] = [];

    console.log("[executarScraping] Antes de visitar empresas");
    console.time("[perf] visitar empresas");

    const totalResultados = results.length;

    for (let indice = 0; indice < results.length; indice++) {
      const result = results[indice];
      if (!result.urlMaps) continue;

      const inicioEmpresa = Date.now();
      const posicao = indice + 1;
      const progressoVisita = totalResultados > 0
        ? 40 + Math.round((posicao / totalResultados) * 50)
        : 40;

      try {
        console.log(`[STATUS ENVIADO] Visitando empresa ${posicao}/${totalResultados}`);
        onStatus?.(`Visitando empresa ${posicao}/${totalResultados}`, progressoVisita);
        console.log("[executarScraping] Antes de page.goto()", result.urlMaps);
        await page.goto(result.urlMaps);
        console.log("[executarScraping] Depois de page.goto()", result.urlMaps);

        try {
          await page.waitForSelector("h1", { timeout: 15000 });
        } catch {
          console.log("URL atual:", page.url());
        }

        console.log(`[STATUS ENVIADO] Extraindo dados ${posicao}/${totalResultados}`);
        onStatus?.(`Extraindo dados ${posicao}/${totalResultados}`, progressoVisita);
        console.log("[executarScraping] Antes da extração", page.url());
        console.time("[perf] extração de dados da empresa");
        const companyData = await extrairDadosEmpresa(page);
        console.timeEnd("[perf] extração de dados da empresa");
        console.log("[executarScraping] Depois da extração", companyData);

        const empresa = {
          nome: limparTexto(companyData.nome),
          telefone: limparTexto(companyData.telefone),
          website: limparTexto(companyData.website),
          endereco: limparTexto(companyData.endereco),
          cidade,
          categoria,
          urlMaps: page.url(),
          capturadoEm: new Date().toISOString(),
        };

        empresas.push(empresa);

        console.time("[perf] salvar leads");
        await inserirLead(empresa);
        console.timeEnd("[perf] salvar leads");

        temposPorEmpresa.push(Date.now() - inicioEmpresa);
      } catch (erro) {
        console.log("Erro ao processar empresa. URL:", result.urlMaps, "Erro:", erro);
      }
    }

    console.timeEnd("[perf] visitar empresas");
    console.log("[executarScraping] Depois de visitar empresas");

    const tempoMedioPorEmpresa =
      temposPorEmpresa.length > 0
        ? temposPorEmpresa.reduce((soma, tempo) => soma + tempo, 0) / temposPorEmpresa.length
        : 0;

    console.log("[perf] Quantidade de empresas realmente visitadas:", empresas.length);
    console.log("[perf] Tempo médio por empresa (ms):", tempoMedioPorEmpresa.toFixed(2));

    console.log("Quantidade de empresas adicionadas ao array empresas:", empresas.length);

    console.log("[STATUS ENVIADO] Salvando leads");
    onStatus?.("Salvando leads", 95);

    console.log("[executarScraping] Antes de browser.close()");
    console.time("[executarScraping] browser.close()");
    try {
      await browser.close();
    } catch (erroFechamento) {
      console.error("[executarScraping] Erro ao fechar o navegador:", erroFechamento);
    }
    console.timeEnd("[executarScraping] browser.close()");
    console.log("[executarScraping] Depois de browser.close()");

    console.log("[STATUS ENVIADO] Finalizado");
    onStatus?.("Finalizado", 100);

    return empresas;
  } finally {
    console.timeEnd("[perf] executarScraping() completo");
    scrapingEmAndamento = false;
  }
}
