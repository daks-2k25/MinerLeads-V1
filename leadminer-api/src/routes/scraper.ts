import { Router } from "express";
import { executarScraping } from "../scraper/service";

const router = Router();

router.post("/", async (req, res) => {
  const { termoBusca, cidade, bairro, categoria } = req.body;

  if (!termoBusca) {
    return res.status(400).json({ error: "termoBusca é obrigatório" });
  }

  try {
    const leads = await executarScraping(termoBusca, cidade, bairro, categoria);

    console.time("[perf] geração da resposta");
    const resposta = res.status(200).json(leads);
    console.timeEnd("[perf] geração da resposta");

    return resposta;
  } catch (erro) {
    console.error("Erro ao executar scraping:", erro);
    return res.status(500).json({ error: "Erro ao executar scraping" });
  }
});

export default router;
