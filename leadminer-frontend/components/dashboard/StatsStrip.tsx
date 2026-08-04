import { Panel } from "@/components/ui/Panel";
import { LeadStats } from "@/lib/leadStats";

export function StatsStrip({ stats }: { stats: LeadStats }) {
  const cells: { k: string; v: string | number; accent?: boolean }[] = [
    { k: "Leads na lista", v: stats.total },
    { k: "Com telefone", v: stats.comTelefone, accent: true },
    { k: "Com site", v: stats.comSite, accent: true },
    { k: "Cidade em foco", v: stats.cidadeEmFoco },
  ];

  return (
    <Panel className="flex divide-x divide-border overflow-hidden">
      {cells.map((cell) => (
        <div key={cell.k} className="flex-1 px-4 py-3">
          <div className="text-[11px] tracking-wide text-muted uppercase">{cell.k}</div>
          <div
            className={`mt-1 text-[20px] font-bold tracking-tight ${
              cell.accent ? "text-accent" : "text-foreground"
            }`}
          >
            {cell.v}
          </div>
        </div>
      ))}
    </Panel>
  );
}
