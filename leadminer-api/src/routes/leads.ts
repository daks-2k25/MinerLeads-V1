import { Router } from "express";
import { listarLeads } from "../storage/leads";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const leads = await listarLeads();
    return res.status(200).json(leads);
  } catch (erro) {
    console.error("Erro ao listar leads:", erro);
    return res.status(500).json({ error: "Erro ao listar leads" });
  }
});

export default router;
