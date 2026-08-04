import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { DashboardMetrics } from "@/src/models/dashboardMetrics";

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarMetricas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`);
      if (!response.ok) throw new Error("Não foi possível carregar as métricas do dashboard");
      const dados: DashboardMetrics = await response.json();
      setMetrics(dados);
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : "Erro ao carregar o dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarMetricas();
  }, [carregarMetricas]);

  return { metrics, loading, error, carregarMetricas };
}
