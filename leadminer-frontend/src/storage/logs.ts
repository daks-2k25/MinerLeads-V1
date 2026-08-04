export type NivelLog = "info" | "warn" | "error";

type Log = {
  nivel: NivelLog;
  origem: string;
  mensagem: string;
  contexto?: Record<string, unknown>;
  buscaId?: number;
  criadoEm: string;
};

let logs: Log[] = [];

export function registrarLog(
  nivel: NivelLog,
  origem: string,
  mensagem: string,
  contexto?: Record<string, unknown>,
  buscaId?: number
) {
  logs.push({
    nivel,
    origem,
    mensagem,
    contexto,
    buscaId,
    criadoEm: new Date().toISOString(),
  });

  console.log("[LOG]", {
    nivel,
    origem,
    mensagem,
  });
}