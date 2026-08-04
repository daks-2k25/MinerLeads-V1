import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { Lead } from "@/src/models/lead";
import { SearchStatus } from "@/components/feedback/StatusBanner";

function mensagemSucesso(quantidade: number) {
  if (quantidade === 0) {
    return "Nenhum lead encontrado para esses filtros. Tente ajustar cidade, bairro ou categoria.";
  }
  if (quantidade === 1) {
    return "Pronto! 1 lead encontrado nesta busca.";
  }
  return `Pronto! ${quantidade} leads encontrados nesta busca.`;
}

function mensagemErro(detalhe?: string) {
  return `Não foi possível concluir a busca${detalhe ? `: ${detalhe}` : "."}`;
}

// O NestJS (HttpExceptionFilter) devolve {statusCode, timestamp, path, message}.
// Para exceções simples message é string; para ValidationPipe/HttpException
// específicas (400/404/409...) message é o objeto {statusCode, message, error}
// original do Nest — por isso a extração tenta os dois formatos.
function extrairMensagemErroNestJS(corpo: unknown): string | undefined {
  if (!corpo || typeof corpo !== "object") return undefined;

  const { message } = corpo as { message?: unknown };

  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");

  if (message && typeof message === "object" && "message" in message) {
    const interno = (message as { message?: unknown }).message;
    if (typeof interno === "string") return interno;
    if (Array.isArray(interno)) return interno.join(", ");
  }

  return undefined;
}

export function useScraperSearch(onResultados: (leads: Lead[]) => void) {
  const [termoBusca, setTermoBusca] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [progresso, setProgresso] = useState<{ etapa: string; progresso: number } | null>(null);

  const handlePesquisar = async () => {
    setLoading(true);
    setStatus(null);
    setProgresso(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/scraper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termoBusca, cidade, bairro, categoria }),
      });

      if (!response.ok) {
        const corpoErro = await response.json().catch(() => null);
        setStatus({
          message: mensagemErro(extrairMensagemErroNestJS(corpoErro)),
          tone: "error",
        });
        return;
      }

      const leads: Lead[] = await response.json();

      setStatus({ message: mensagemSucesso(leads.length), tone: "success" });
      onResultados(leads);
    } catch (erro) {
      setStatus({
        message: mensagemErro(erro instanceof Error ? erro.message : undefined),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    termoBusca,
    setTermoBusca,
    cidade,
    setCidade,
    bairro,
    setBairro,
    categoria,
    setCategoria,
    loading,
    status,
    progresso,
    handlePesquisar,
  };
}
