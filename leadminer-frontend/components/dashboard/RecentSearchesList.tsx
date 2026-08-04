import { Panel } from "@/components/ui/Panel";
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

export function RecentSearchesList({ pesquisas }: { pesquisas: UltimaPesquisa[] }) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-bold text-foreground">Últimas pesquisas</h2>
      </div>

      {pesquisas.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-muted">
          Nenhuma pesquisa registrada ainda.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {pesquisas.map((pesquisa) => {
            const detalhes = [pesquisa.cidade, pesquisa.categoria].filter(Boolean).join(" · ");
            return (
              <div key={pesquisa.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground" title={pesquisa.termoBusca}>
                    {pesquisa.termoBusca}
                  </div>
                  {detalhes && (
                    <div className="truncate text-[11.5px] text-muted" title={detalhes}>
                      {detalhes}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div className="text-[11.5px] text-muted-2">
                    <span className="font-bold text-accent">{pesquisa.quantidadeNovos}</span> novos ·{" "}
                    <span className="font-bold text-foreground">{pesquisa.quantidadeCache}</span> cache
                  </div>
                  <span className="rounded-[5px] bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold text-accent">
                    {pesquisa.quantidadeLeads}
                  </span>
                  <span className="w-[88px] shrink-0 font-mono text-[10.5px] text-muted-2 tabular-nums">
                    {formatarData(pesquisa.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
