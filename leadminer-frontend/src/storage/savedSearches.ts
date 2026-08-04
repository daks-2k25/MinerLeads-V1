import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SavedSearch } from "../models/savedSearch";

const dbPath = path.join(process.cwd(), "data", "leads.db");
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    termoBusca TEXT NOT NULL,
    cidade TEXT,
    bairro TEXT,
    categoria TEXT,
    criadoEm TEXT
  )
`);

const criarStmt = db.prepare(`
  INSERT INTO saved_searches (nome, termoBusca, cidade, bairro, categoria, criadoEm)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function criarBuscaSalva(busca: SavedSearch): SavedSearch {
  const criadoEm = busca.criadoEm ?? new Date().toISOString();

  const resultado = criarStmt.run(
    busca.nome,
    busca.termoBusca,
    busca.cidade,
    busca.bairro,
    busca.categoria,
    criadoEm
  );

  return {
    id: Number(resultado.lastInsertRowid),
    nome: busca.nome,
    termoBusca: busca.termoBusca,
    cidade: busca.cidade,
    bairro: busca.bairro,
    categoria: busca.categoria,
    criadoEm,
  };
}

const listarStmt = db.prepare(`
  SELECT id, nome, termoBusca, cidade, bairro, categoria, criadoEm
  FROM saved_searches
  ORDER BY id DESC
`);

export function listarBuscasSalvas(): SavedSearch[] {
  return listarStmt.all() as unknown as SavedSearch[];
}

const removerStmt = db.prepare(`
  DELETE FROM saved_searches WHERE id = ?
`);

export function removerBuscaSalva(id: number) {
  removerStmt.run(id);
}
