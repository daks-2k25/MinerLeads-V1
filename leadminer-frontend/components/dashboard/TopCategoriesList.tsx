import { Panel } from "@/components/ui/Panel";
import { CategoriaMaisPesquisada } from "@/src/models/dashboardMetrics";

export function TopCategoriesList({ categorias }: { categorias: CategoriaMaisPesquisada[] }) {
  const maiorContagem = Math.max(1, ...categorias.map((c) => c.totalPesquisas));

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-bold text-foreground">Categorias mais pesquisadas</h2>
      </div>

      {categorias.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-muted">
          Nenhuma categoria registrada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 px-4 py-3.5">
          {categorias.map((item) => (
            <div key={item.categoria} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[12.5px] font-medium text-foreground" title={item.categoria}>
                {item.categoria}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(item.totalPesquisas / maiorContagem) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-[12.5px] font-bold tabular-nums text-muted">
                {item.totalPesquisas}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
