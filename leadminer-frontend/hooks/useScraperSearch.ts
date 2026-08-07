import { useRef, useState } from "react";
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

function mensagemCancelada(quantidade: number) {
  if (quantidade === 0) {
    return "Busca cancelada pelo usuário.";
  }
  if (quantidade === 1) {
    return "Busca cancelada pelo usuário. 1 lead foi capturado até o momento.";
  }
  return `Busca cancelada pelo usuário. ${quantidade} leads foram capturados até o momento.`;
}

interface BuscaAtualResponse {
  emAndamento: boolean;
  searchId: string | null;
}

interface CancelarBuscaResponse {
  success: boolean;
  cancelado: boolean;
  searchId?: string;
  totalResultados?: number;
  message?: string;
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
  const [cancelando, setCancelando] = useState(false);
  // Ref (não state): handlePesquisar é uma closure assíncrona criada no
  // clique em "Pesquisar" — ler `cancelando`/`status` nela depois de um
  // `await` não veria o cancelamento pedido durante a espera, pois cada
  // render tem seu próprio snapshot do state. A ref é compartilhada e
  // sempre reflete o valor mais recente, independente de closures.
  const canceladoRef = useRef(false);

  const handlePesquisar = async () => {
    canceladoRef.current = false;
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

      const mensagem = canceladoRef.current
        ? mensagemCancelada(leads.length)
        : mensagemSucesso(leads.length);
      setStatus({ message: mensagem, tone: "success" });
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

  // Não mexe em `loading`: quem controla o fim do carregamento continua
  // sendo o `finally` de handlePesquisar, que só roda quando o POST
  // /api/scraper original (ainda em andamento) resolve — isso já acontece
  // naturalmente após o backend cancelar e encerrar a busca. Encerrar
  // `loading` aqui mais cedo permitiria uma nova pesquisa antes do backend
  // liberar `scrapingEmAndamento`, gerando o erro "Já existe um scraping em
  // andamento".
  const handleCancelarBusca = async () => {
    if (cancelando) return;

    setCancelando(true);
    setStatus({ message: "Cancelando busca...", tone: "success" });

    try {
      const responseAtual = await fetch(`${API_BASE_URL}/api/scraper/atual`);
      const atual: BuscaAtualResponse | null = await responseAtual
        .json()
        .catch(() => null);

      if (!atual?.searchId) {
        setStatus({
          message: "Nenhuma busca em andamento para cancelar.",
          tone: "error",
        });
        return;
      }

      const responseCancelar = await fetch(
        `${API_BASE_URL}/api/scraper/${atual.searchId}/cancel`,
        { method: "POST" },
      );
      const resultado: CancelarBuscaResponse | null = await responseCancelar
        .json()
        .catch(() => null);

      if (resultado?.cancelado) {
        canceladoRef.current = true;
        setStatus({
          message: "Busca cancelada. Encerrando...",
          tone: "success",
        });
      } else {
        setStatus({
          message: mensagemErro(resultado?.message),
          tone: "error",
        });
      }
    } catch (erro) {
      setStatus({
        message: mensagemErro(erro instanceof Error ? erro.message : undefined),
        tone: "error",
      });
    } finally {
      setCancelando(false);
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
    cancelando,
    handleCancelarBusca,
  };
}
