"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_1 = require("../scraper/service");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    const { termoBusca, cidade, bairro, categoria } = req.body;
    if (!termoBusca) {
        return res.status(400).json({ error: "termoBusca é obrigatório" });
    }
    try {
        const leads = await (0, service_1.executarScraping)(termoBusca, cidade, bairro, categoria);
        console.time("[perf] geração da resposta");
        const resposta = res.status(200).json(leads);
        console.timeEnd("[perf] geração da resposta");
        return resposta;
    }
    catch (erro) {
        console.error("Erro ao executar scraping:", erro);
        return res.status(500).json({ error: "Erro ao executar scraping" });
    }
});
exports.default = router;
//# sourceMappingURL=scraper.js.map