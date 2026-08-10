import { ComponentType } from "react";
import { Panel } from "@/components/ui/Panel";
import { DatabaseIcon, GlobeIcon, PhoneIcon } from "@/components/ui/icons";
import { MapPinIcon } from "@/components/leads/icons";
import { LeadStats } from "@/lib/leadStats";

type IconComponent = ComponentType<{ className?: string }>;

export function StatsStrip({ stats }: { stats: LeadStats }) {
  const cells: { k: string; v: string | number; accent?: boolean; icon: IconComponent }[] = [
    { k: "Leads na lista", v: stats.total, icon: DatabaseIcon },
    { k: "Com telefone", v: stats.comTelefone, accent: true, icon: PhoneIcon },
    { k: "Com site", v: stats.comSite, accent: true, icon: GlobeIcon },
    { k: "Cidade em foco", v: stats.cidadeEmFoco, icon: MapPinIcon },
  ];

  return (
    <Panel className="flex flex-col divide-y divide-border overflow-hidden sm:flex-row sm:divide-x sm:divide-y-0">
      {cells.map((cell) => {
        const Icon = cell.icon;
        return (
          <div key={cell.k} className="flex flex-1 items-center gap-3 px-4 py-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                cell.accent ? "bg-accent-soft text-accent" : "bg-subtle text-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] tracking-wide text-muted uppercase">{cell.k}</div>
              <div
                className={`mt-0.5 truncate text-[19px] font-bold tracking-tight ${
                  cell.accent ? "text-accent" : "text-foreground"
                }`}
              >
                {cell.v}
              </div>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
