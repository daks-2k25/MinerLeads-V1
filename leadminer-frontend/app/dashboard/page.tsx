"use client";

import Link from "next/link";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { LatestSearchCard } from "@/components/dashboard/LatestSearchCard";
import { RecentSearchesList } from "@/components/dashboard/RecentSearchesList";
import { TopCategoriesList } from "@/components/dashboard/TopCategoriesList";
import { Panel } from "@/components/ui/Panel";
import { StatusBanner } from "@/components/feedback/StatusBanner";

export default function DashboardPage() {
  const { metrics, loading, error, carregarMetricas } = useDashboardMetrics();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-5 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-[12px] font-medium text-muted hover:text-accent">
            ← Voltar para leads
          </Link>
          <h1 className="mt-1 text-[19px] font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={() => carregarMetricas()}
          disabled={loading}
          className="rounded-[7px] border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <StatusBanner status={error ? { message: error, tone: "error" } : null} />

      {!metrics && loading && (
        <Panel className="px-4 py-6 text-center text-[12.5px] text-muted">
          Carregando métricas...
        </Panel>
      )}

      {metrics && (
        <>
          <LatestSearchCard pesquisa={metrics.ultimasPesquisas[0]} />

          <MetricsGrid
            totalLeads={metrics.totalLeads}
            totalPesquisas={metrics.totalPesquisas}
            totalLeadsNovos={metrics.totalLeadsNovos}
            totalLeadsCache={metrics.totalLeadsCache}
            chamadasEvitadasCache={metrics.chamadasEvitadasCache}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RecentSearchesList pesquisas={metrics.ultimasPesquisas} />
            <TopCategoriesList categorias={metrics.categoriasMaisPesquisadas} />
          </div>
        </>
      )}
    </div>
  );
}
