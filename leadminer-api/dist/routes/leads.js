"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leads_1 = require("../storage/leads");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        const leads = await (0, leads_1.listarLeads)();
        return res.status(200).json(leads);
    }
    catch (erro) {
        console.error("Erro ao listar leads:", erro);
        return res.status(500).json({ error: "Erro ao listar leads" });
    }
});
exports.default = router;
//# sourceMappingURL=leads.js.map