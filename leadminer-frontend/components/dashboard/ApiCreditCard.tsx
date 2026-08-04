import { Panel } from "@/components/ui/Panel";
import { ApiCredit } from "@/src/models/dashboardMetrics";

type NivelAlerta = "normal" | "atencao" | "critico";

const ALERTA_CONFIG: Record<NivelAlerta, { label: string; badge: string; barra: string }> = {
  normal: {
    label: "Saldo normal",
    badge: "bg-success-soft text-success",
    barra: "bg-accent",
  },
  atencao: {
    label: "Atenção: saldo baixo",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    barra: "bg-amber-500",
  },
  critico: {
    label: "Crítico: saldo quase esgotado",
    badge: "bg-danger-soft text-danger",
    barra: "bg-danger",
  },
};

function calcularNivel(percentualRestante: number): NivelAlerta {
  if (percentualRestante < 10) return "critico";
  if (percentualRestante < 25) return "atencao";
  return "normal";
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ApiCreditCard({ apiCredit }: { apiCredit: ApiCredit }) {
  const { creditoInicial, consumoEstimado, saldoRestante } = apiCredit;
  const percentualRestante =
    creditoInicial > 0 ? Math.min(100, Math.max(0, (saldoRestante / creditoInicial) * 100)) : 0;
  const nivel = calcularNivel(percentualRestante);
  const config = ALERTA_CONFIG[nivel];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-bold text-foreground">Crédito da API</h2>
        <span className={`rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold ${config.badge}`}>
          {config.label}
        </span>
      </div>

      <div className="flex divide-x divide-border">
        <div className="flex-1 px-4 py-3">
          <div className="text-[11px] tracking-wide text-muted uppercase">Crédito inicial</div>
          <div className="mt-1 text-[20px] font-bold tracking-tight tabular-nums text-foreground">
            {formatarMoeda(creditoInicial)}
          </div>
        </div>
        <div className="flex-1 px-4 py-3">
          <div className="text-[11px] tracking-wide text-muted uppercase">Consumido</div>
          <div className="mt-1 text-[20px] font-bold tracking-tight tabular-nums text-foreground">
            {formatarMoeda(consumoEstimado)}
          </div>
        </div>
        <div className="flex-1 px-4 py-3">
          <div className="text-[11px] tracking-wide text-muted uppercase">Disponível</div>
          <div className="mt-1 text-[20px] font-bold tracking-tight tabular-nums text-accent">
            {formatarMoeda(saldoRestante)}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${config.barra}`}
            style={{ width: `${percentualRestante}%` }}
          />
        </div>
      </div>
    </Panel>
  );
}
