import { chromium } from "playwright-core";

async function testBrowser() {
  const browser = await chromium.launch();

  const page = await browser.newPage();

  await page.goto("https://www.google.com/search?q=clinicas+curitiba");

  const title = await page.title();
  const url = page.url();

  console.log(title);
  console.log(url);

  await browser.close();
}

testBrowser();