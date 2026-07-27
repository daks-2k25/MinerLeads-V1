import express from "express";
import cors from "cors";
import scraperRouter from "./routes/scraper";
import leadsRouter from "./routes/leads";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/scraper", scraperRouter);
app.use("/api/leads", leadsRouter);

export default app;
