import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "leads.db");
const backupsDir = path.join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 7;

function timestampParaNomeArquivo(data: Date): string {
  return data.toISOString().replace(/[:.]/g, "-");
}

function removerBackupsAntigos() {
  const arquivos = readdirSync(backupsDir)
    .filter((nome) => nome.startsWith("leads-") && nome.endsWith(".db"))
    .sort()
    .reverse();

  for (const nome of arquivos.slice(MAX_BACKUPS)) {
    unlinkSync(path.join(backupsDir, nome));
  }
}

export async function realizarBackup(): Promise<string> {
  mkdirSync(backupsDir, { recursive: true });

  const nomeArquivo = `leads-${timestampParaNomeArquivo(new Date())}.db`;
  const destino = path.join(backupsDir, nomeArquivo);

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    await backup(db, destino);
  } finally {
    db.close();
  }

  removerBackupsAntigos();

  return destino;
}
