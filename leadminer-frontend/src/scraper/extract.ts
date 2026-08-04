import type { Page } from "playwright-core";

export async function extrairDadosEmpresa(page: Page) {
  return await page.evaluate(() => {
    const nome = document.querySelector("h1")?.textContent?.trim() ?? null;

    const phoneEl = document.querySelector('[data-item-id^="phone:"]');
    const telefone = phoneEl?.textContent?.trim() ?? null;

    const websiteEl = document.querySelector('[data-item-id="authority"]');
    const website = websiteEl?.textContent?.trim() ?? null;

    const addressEl = document.querySelector('[data-item-id="address"]');
    const endereco = addressEl?.textContent?.trim() ?? null;

    return { nome, telefone, website, endereco };
  });
}
