import { Panel } from "@/components/ui/Panel";

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
  const cards: { k: string; v: number; accent?: boolean }[] = [
    { k: "Total de leads", v: totalLeads },
    { k: "Total de pesquisas", v: totalPesquisas },
    { k: "Leads novos", v: totalLeadsNovos, accent: true },
    { k: "Leads do cache", v: totalLeadsCache, accent: true },
    { k: "Chamadas evitadas", v: chamadasEvitadasCache, accent: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Panel key={card.k} className="px-4 py-3.5">
          <div className="text-[11px] tracking-wide text-muted uppercase">{card.k}</div>
          <div
            className={`mt-1 text-[24px] font-bold tracking-tight tabular-nums ${
              card.accent ? "text-accent" : "text-foreground"
            }`}
          >
            {card.v.toLocaleString("pt-BR")}
          </div>
        </Panel>
      ))}
    </div>
  );
}
