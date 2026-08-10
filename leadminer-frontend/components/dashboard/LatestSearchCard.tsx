import { Panel } from "@/components/ui/Panel";
import { TrendingUpIcon } from "@/components/ui/icons";
import { UltimaPesquisa } from "@/src/models/dashboardMetrics";

function formatarData(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LatestSearchCard({ pesquisa }: { pesquisa: UltimaPesquisa | undefined }) {
  if (!pesquisa) return null;

  const detalhes = [pesquisa.cidade, pesquisa.categoria].filter(Boolean).join(" · ");

  return (
    <Panel className="animate-fade-slide-up overflow-hidden border-l-[3px] border-l-accent">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-accent uppercase">
            <TrendingUpIcon className="h-3.5 w-3.5" />
            Última busca
          </span>
          <div className="mt-1 truncate text-[16px] font-bold text-foreground" title={pesquisa.termoBusca}>
            {pesquisa.termoBusca}
          </div>
          {detalhes && (
            <div className="truncate text-[12px] text-muted" title={detalhes}>
              {detalhes}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-center">
            <div className="text-[20px] font-bold tabular-nums text-foreground">
              {pesquisa.quantidadeLeads}
            </div>
            <div className="text-[10px] tracking-wide text-muted uppercase">leads</div>
          </div>
          <div className="text-center">
            <div className="text-[20px] font-bold tabular-nums text-accent">
              {pesquisa.quantidadeNovos}
            </div>
            <div className="text-[10px] tracking-wide text-muted uppercase">novos</div>
          </div>
          <div className="font-mono text-[11px] text-muted-2 tabular-nums">
            {formatarData(pesquisa.createdAt)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
