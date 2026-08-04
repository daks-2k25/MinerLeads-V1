"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SavedSearchList } from "@/components/saved-searches/SavedSearchList";
import { SavedSearch } from "@/src/models/savedSearch";
import { SearchHistoryList } from "@/components/search-history/SearchHistoryList";
import { SearchHistory } from "@/src/models/searchHistory";

const upcomingItems = ["Exportações"];

type SidebarProps = {
  buscasSalvas: SavedSearch[];
  buscasSalvasLoading: boolean;
  buscasSalvasError: string | null;
  onSelectBuscaSalva: (busca: SavedSearch) => void;
  onRemoverBuscaSalva: (id: number) => void;
  historico: SearchHistory[];
  historicoLoading: boolean;
  historicoError: string | null;
  onRepetirHistorico: (item: SearchHistory) => void;
  onRemoverHistorico: (id: number) => void;
  onExportarHistorico: (item: SearchHistory) => void;
  exportandoHistoricoId: number | null;
  erroExportacaoHistorico: string | null;
};

export function Sidebar({
  buscasSalvas,
  buscasSalvasLoading,
  buscasSalvasError,
  onSelectBuscaSalva,
  onRemoverBuscaSalva,
  historico,
  historicoLoading,
  historicoError,
  onRepetirHistorico,
  onRemoverHistorico,
  onExportarHistorico,
  exportandoHistoricoId,
  erroExportacaoHistorico,
}: SidebarProps) {
  const [buscasAbertas, setBuscasAbertas] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  return (
    <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-subtle p-3 md:flex">
      <div className="flex items-center gap-2 px-2 pb-4 pt-1">
        <span className="relative block h-[22px] w-[22px] shrink-0 rounded-[6px] bg-accent">
          <span className="absolute inset-[6px] rounded-[2px] border-[1.5px] border-white/90" />
        </span>
        <span
          translate="no"
          className="text-[14px] font-bold tracking-tight text-foreground"
        >
          LeadMiner
        </span>
      </div>

      <div className="flex items-center gap-2.5 rounded-[7px] bg-surface px-2.5 py-2 text-[13px] font-medium text-foreground shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Leads
      </div>

      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Dashboard
      </Link>

      <button
        type="button"
        onClick={() => setBuscasAbertas((atual) => !atual)}
        aria-expanded={buscasAbertas}
        className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Buscas salvas
        <span className="ml-auto text-[9px] text-muted-2">{buscasAbertas ? "▲" : "▼"}</span>
      </button>

      {buscasAbertas && (
        <div className="ml-1 border-l border-border py-0.5 pl-1.5">
          <SavedSearchList
            buscas={buscasSalvas}
            loading={buscasSalvasLoading}
            error={buscasSalvasError}
            onSelect={onSelectBuscaSalva}
            onRemove={onRemoverBuscaSalva}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setHistoricoAberto((atual) => !atual)}
        aria-expanded={historicoAberto}
        className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Histórico
        <span className="ml-auto text-[9px] text-muted-2">{historicoAberto ? "▲" : "▼"}</span>
      </button>

      {historicoAberto && (
        <div className="ml-1 border-l border-border py-0.5 pl-1.5">
          <SearchHistoryList
            historico={historico}
            loading={historicoLoading}
            error={historicoError}
            onRepetir={onRepetirHistorico}
            onRemove={onRemoverHistorico}
            onExportar={onExportarHistorico}
            exportandoId={exportandoHistoricoId}
            erroExportacao={erroExportacaoHistorico}
          />
        </div>
      )}

      {upcomingItems.map((item) => (
        <div
          key={item}
          className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-muted-2"
          aria-disabled="true"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-muted-2" />
          {item}
          <span className="ml-auto text-[10px] text-muted-2">em breve</span>
        </div>
      ))}

      <div className="mt-auto flex items-center justify-between border-t border-border px-2.5 pt-3">
        <span translate="no" className="text-[11.5px] text-muted-2">
          LeadMiner
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
