"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executarScraping = executarScraping;
const maps_1 = require("./maps");
const extract_1 = require("./extract");
const leads_1 = require("../storage/leads");
function limparTexto(texto) {
    if (!texto)
        return null;
    return texto
        .replace(/[^\p{L}\p{N}\s()+\-.,:/]/gu, "")
        .trim();
}
let scrapingEmAndamento = false;
async function executarScraping(termoBusca, cidade, bairro, categoria) {
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
        const buscaComCidade = [termoBusca, bairro, cidade].filter(Boolean).join(" ");
        console.log("[executarScraping] Antes de buscarEmpresasMaps()");
        console.time("[executarScraping] buscarEmpresasMaps()");
        const { browser, page, results } = await (0, maps_1.buscarEmpresasMaps)(buscaComCidade);
        console.timeEnd("[executarScraping] buscarEmpresasMaps()");
        console.log("[executarScraping] Depois de buscarEmpresasMaps()");
        console.log("[perf] Quantidade de empresas encontradas:", results.length);
        const empresas = [];
        const temposPorEmpresa = [];
        console.log("[executarScraping] Antes de visitar empresas");
        console.time("[perf] visitar empresas");
        for (const result of results) {
            if (!result.urlMaps)
                continue;
            const inicioEmpresa = Date.now();
            try {
                console.log("[executarScraping] Antes de page.goto()", result.urlMaps);
                await page.goto(result.urlMaps);
                console.log("[executarScraping] Depois de page.goto()", result.urlMaps);
                try {
                    await page.waitForSelector("h1", { timeout: 15000 });
                }
                catch {
                    console.log("URL atual:", page.url());
                }
                console.log("[executarScraping] Antes da extração", page.url());
                console.time("[perf] extração de dados da empresa");
                const companyData = await (0, extract_1.extrairDadosEmpresa)(page);
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
                await (0, leads_1.inserirLead)(empresa);
                console.timeEnd("[perf] salvar leads");
                temposPorEmpresa.push(Date.now() - inicioEmpresa);
            }
            catch (erro) {
                console.log("Erro ao processar empresa. URL:", result.urlMaps, "Erro:", erro);
            }
        }
        console.timeEnd("[perf] visitar empresas");
        console.log("[executarScraping] Depois de visitar empresas");
        const tempoMedioPorEmpresa = temposPorEmpresa.length > 0
            ? temposPorEmpresa.reduce((soma, tempo) => soma + tempo, 0) / temposPorEmpresa.length
            : 0;
        console.log("[perf] Quantidade de empresas realmente visitadas:", empresas.length);
        console.log("[perf] Tempo médio por empresa (ms):", tempoMedioPorEmpresa.toFixed(2));
        console.log("Quantidade de empresas adicionadas ao array empresas:", empresas.length);
        console.log("[executarScraping] Antes de browser.close()");
        console.time("[executarScraping] browser.close()");
        await browser.close();
        console.timeEnd("[executarScraping] browser.close()");
        console.log("[executarScraping] Depois de browser.close()");
        return empresas;
    }
    finally {
        console.timeEnd("[perf] executarScraping() completo");
        scrapingEmAndamento = false;
    }
}
//# sourceMappingURL=service.js.map