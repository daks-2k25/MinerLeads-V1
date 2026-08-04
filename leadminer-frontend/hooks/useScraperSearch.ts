import { useState } from "react";
import { Lead } from "@/src/models/lead";
import { SearchStatus } from "@/components/feedback/StatusBanner";

interface EventoStatus {
  tipo: "status";
  etapa: string;
  progresso: number;
}

interface EventoResultado {
  tipo: "resultado";
  leads: Lead[];
}

interface EventoErro {
  tipo: "erro";
  error: string;
  detalhe?: string;
}

type EventoScraper = EventoStatus | EventoResultado | EventoErro;

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
      const response = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termoBusca, cidade, bairro, categoria }),
      });

      if (!response.ok) {
        const erro = await response.json();
        setStatus({
          message: mensagemErro(erro.detalhe ?? erro.error ?? "erro ao executar scraping"),
          tone: "error",
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setStatus({ message: mensagemErro("resposta vazia do servidor"), tone: "error" });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const linhas = buffer.split("\n");
        buffer = linhas.pop() ?? "";

        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evento: EventoScraper = JSON.parse(linha);

          if (evento.tipo === "status") {
            setProgresso({ etapa: evento.etapa, progresso: evento.progresso });
          } else if (evento.tipo === "resultado") {
            setStatus({ message: mensagemSucesso(evento.leads.length), tone: "success" });
            onResultados(evento.leads);
          } else if (evento.tipo === "erro") {
            setStatus({ message: mensagemErro(evento.detalhe ?? evento.error), tone: "error" });
          }
        }
      }
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
