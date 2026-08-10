"use client";

import { ComponentType, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  MenuIcon,
  CloseIcon,
  PickaxeIcon,
  GaugeIcon,
  BookmarkIcon,
  ClockIcon,
  DownloadIcon,
  BarChartIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import { SavedSearchList } from "@/components/saved-searches/SavedSearchList";
import { SavedSearch } from "@/src/models/savedSearch";
import { SearchHistoryList } from "@/components/search-history/SearchHistoryList";
import { SearchHistory } from "@/src/models/searchHistory";

const upcomingItems: { label: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: "Configurações", icon: SettingsIcon },
  { label: "Relatórios", icon: BarChartIcon },
  { label: "Exportações", icon: DownloadIcon },
];

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

// Cores seguem a logo oficial (1x/TEXT DARK.png): "LEAD" em teal de marca,
// "MINER" em neutro — não o inverso que estava aqui antes.
function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span translate="no" className={`font-bold tracking-tight ${className}`}>
      <span className="text-accent">Lead</span>
      <span className="text-foreground">Miner</span>
    </span>
  );
}

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <img
      src="/logo-icon.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2 pb-4 pt-1">
      <LogoMark />
      <Wordmark className="text-[14px]" />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pt-4 pb-1 text-[10px] font-semibold tracking-wide text-muted-2 uppercase first:pt-0">
      {children}
    </div>
  );
}

function NavItem({
  href,
  ativo,
  icon: Icon,
  children,
}: {
  href: string;
  ativo: boolean;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
        ativo ? "bg-surface text-foreground shadow-sm" : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${ativo ? "text-accent" : "text-muted-2"}`} />
      {children}
    </Link>
  );
}

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
  const pathname = usePathname();
  const [buscasAbertas, setBuscasAbertas] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    setMenuMobileAberto(false);
  }, [pathname]);

  const navContent = (
    <>
      <Logo />

      <SectionLabel>Principal</SectionLabel>

      <NavItem href="/" ativo={pathname === "/"} icon={PickaxeIcon}>
        Minerar Leads
      </NavItem>

      <NavItem href="/dashboard" ativo={pathname === "/dashboard"} icon={GaugeIcon}>
        Dashboard
      </NavItem>

      <SectionLabel>Dados</SectionLabel>

      <button
        type="button"
        onClick={() => setHistoricoAberto((atual) => !atual)}
        aria-expanded={historicoAberto}
        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-surface ${
          historicoAberto ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <ClockIcon className={`h-4 w-4 shrink-0 ${historicoAberto ? "text-accent" : "text-muted-2"}`} />
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

      <button
        type="button"
        onClick={() => setBuscasAbertas((atual) => !atual)}
        aria-expanded={buscasAbertas}
        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-surface ${
          buscasAbertas ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <BookmarkIcon className={`h-4 w-4 shrink-0 ${buscasAbertas ? "text-accent" : "text-muted-2"}`} />
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

      <SectionLabel>Sistema</SectionLabel>

      {upcomingItems.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-muted-2"
          aria-disabled="true"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-2" />
          {label}
          <span className="ml-auto text-[10px] text-muted-2">em breve</span>
        </div>
      ))}

      <div className="mt-auto flex items-center justify-between border-t border-border px-2.5 pt-3">
        <span translate="no" className="text-[11.5px] text-muted-2">
          LeadMiner
        </span>
        <ThemeToggle />
      </div>
    </>
  );

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-subtle px-3 py-2.5 md:hidden">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <Wordmark className="text-[13.5px]" />
        </div>
        <button
          type="button"
          onClick={() => setMenuMobileAberto(true)}
          aria-label="Abrir menu"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-accent"
        >
          <MenuIcon className="h-4 w-4" />
        </button>
      </header>

      {menuMobileAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            onClick={() => setMenuMobileAberto(false)}
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative flex h-full w-64 max-w-[85vw] flex-col gap-1 overflow-y-auto bg-subtle p-3 shadow-lg">
            <button
              type="button"
              onClick={() => setMenuMobileAberto(false)}
              aria-label="Fechar menu"
              className="mb-1 flex h-7 w-7 items-center justify-center self-end rounded-[6px] border border-border text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <aside className="hidden w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-subtle p-3 md:flex">
        {navContent}
      </aside>
    </>
  );
}
