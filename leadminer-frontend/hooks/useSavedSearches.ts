import { useCallback, useEffect, useState } from "react";
import { SavedSearch } from "@/src/models/savedSearch";

type NovaBuscaSalva = Omit<SavedSearch, "id" | "criadoEm">;

export function useSavedSearches() {
  const [buscasSalvas, setBuscasSalvas] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarBuscasSalvas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/saved-searches");
      if (!response.ok) throw new Error("Não foi possível carregar as buscas salvas");
      const dados: SavedSearch[] = await response.json();
      setBuscasSalvas(dados);
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Erro ao carregar buscas salvas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarBuscasSalvas();
  }, [carregarBuscasSalvas]);

  const criarBuscaSalva = useCallback(async (busca: NovaBuscaSalva) => {
    setError(null);

    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(busca),
      });

      if (!response.ok) throw new Error("Não foi possível salvar a busca");

      const novaBusca: SavedSearch = await response.json();
      setBuscasSalvas((atual) => [novaBusca, ...atual]);
      return novaBusca;
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Erro ao salvar busca");
      throw erro;
    }
  }, []);

  const removerBuscaSalva = useCallback(async (id: number) => {
    setError(null);

    try {
      const response = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível remover a busca");
      setBuscasSalvas((atual) => atual.filter((busca) => busca.id !== id));
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Erro ao remover busca");
    }
  }, []);

  return {
    buscasSalvas,
    loading,
    error,
    carregarBuscasSalvas,
    criarBuscaSalva,
    removerBuscaSalva,
  };
}
