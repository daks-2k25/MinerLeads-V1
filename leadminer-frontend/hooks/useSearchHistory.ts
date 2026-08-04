import { useCallback, useEffect, useState } from "react";
import { SearchHistory } from "@/src/models/searchHistory";

export function useSearchHistory() {
  const [historico, setHistorico] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarHistorico = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search-history");
      if (!response.ok) throw new Error("Não foi possível carregar o histórico de buscas");
      const dados: SearchHistory[] = await response.json();
      setHistorico(dados);
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Erro ao carregar histórico de buscas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const removerHistorico = useCallback(async (id: number) => {
    setError(null);

    try {
      const response = await fetch(`/api/search-history/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível remover o item do histórico");
      setHistorico((atual) => atual.filter((item) => item.id !== id));
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Erro ao remover item do histórico");
    }
  }, []);

  return {
    historico,
    loading,
    error,
    carregarHistorico,
    removerHistorico,
  };
}
