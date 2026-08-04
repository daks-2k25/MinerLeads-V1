import { writeFile } from "fs/promises";
import { saveLeads } from "./services/storage";
import { buscarEmpresasMaps } from "./scraper/maps";
import { extrairDadosEmpresa } from "./scraper/extract";

function limparTexto(texto: string | null) {
    if (!texto) return null;

    return texto
        .replace(/[^\p{L}\p{N}\s()+\-.,:/]/gu, "")
        .trim();
}

async function main() {
  const { browser, page, results } = await buscarEmpresasMaps();

  const empresas = [];

  for (const result of results) {
    if (!result.urlMaps) continue;

    await page.goto(result.urlMaps);

    try {
      await page.waitForSelector("h1", { timeout: 15000 });
    } catch {
      await page.screenshot({ path: "maps-company-debug.png" });
      const companyHtmlOnError = await page.content();
      await writeFile("maps-company-debug.html", companyHtmlOnError);
      console.log("URL atual:", page.url());
    }

    await page.screenshot({ path: "maps-company-debug.png" });

    const companyHtml = await page.content();
    await writeFile("maps-company-debug.html", companyHtml);

    const companyData = await extrairDadosEmpresa(page);

    empresas.push({
      nome: limparTexto(companyData.nome),
      telefone: limparTexto(companyData.telefone),
      website: limparTexto(companyData.website),
      endereco: limparTexto(companyData.endereco),
      cidade: "Curitiba",
      categoria: "Clínicas",
      urlMaps: page.url(),
      capturadoEm: new Date().toISOString(),
    });
  }

  console.log(JSON.stringify(empresas, null, 2));

  await saveLeads(empresas);

  await browser.close();
}

main();
