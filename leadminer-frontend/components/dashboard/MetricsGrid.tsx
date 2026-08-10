import { ComponentType } from "react";
import { Panel } from "@/components/ui/Panel";
import { DatabaseIcon, RefreshIcon, SearchIcon, SparklesIcon, TrendingUpIcon } from "@/components/ui/icons";

type IconComponent = ComponentType<{ className?: string }>;
type Metrica = { k: string; v: number; icon: IconComponent };

type MetricsGridProps = {
  totalLeads: number;
  totalPesquisas: number;
  totalLeadsNovos: number;
  totalLeadsCache: number;
  chamadasEvitadasCache: number;
};

export function MetricsGrid({
  totalLeads,
  totalPesquisas,
  totalLeadsNovos,
  totalLeadsCache,
  chamadasEvitadasCache,
}: MetricsGridProps) {
  // Métricas de resultado (o que responde "como está minha prospecção")
  // ganham destaque; métricas operacionais de cache/API ficam secundárias
  // — antes as 5 tinham o mesmo peso visual, o que não ajudava a achar o
  // que importa rapidamente.
  const principais: Metrica[] = [
    { k: "Total de leads", v: totalLeads, icon: DatabaseIcon },
    { k: "Leads novos", v: totalLeadsNovos, icon: TrendingUpIcon },
  ];

  const secundarias: Metrica[] = [
    { k: "Total de pesquisas", v: totalPesquisas, icon: SearchIcon },
    { k: "Leads do cache", v: totalLeadsCache, icon: RefreshIcon },
    { k: "Chamadas evitadas", v: chamadasEvitadasCache, icon: SparklesIcon },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {principais.map((card, index) => {
          const Icon = card.icon;
          return (
            <Panel
              key={card.k}
              className="animate-fade-slide-up flex items-center gap-3 px-4 py-4"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] tracking-wide text-muted uppercase">{card.k}</div>
                <div className="mt-0.5 text-[26px] font-bold tracking-tight tabular-nums text-accent">
                  {card.v.toLocaleString("pt-BR")}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {secundarias.map((card, index) => {
          const Icon = card.icon;
          return (
            <Panel
              key={card.k}
              className="animate-fade-slide-up flex flex-col gap-1.5 px-3.5 py-3"
              style={{ animationDelay: `${(index + 2) * 60}ms` }}
            >
              <div className="flex items-center gap-1.5 text-muted">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[10px] tracking-wide uppercase">{card.k}</span>
              </div>
              <div className="text-[17px] font-bold tabular-nums text-foreground">
                {card.v.toLocaleString("pt-BR")}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
