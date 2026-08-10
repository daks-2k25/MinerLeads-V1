import { memo } from "react";
import { Lead } from "@/src/models/lead";
import { StatusChip } from "@/components/leads/StatusChip";
import { LeadActions } from "@/components/leads/LeadActions";
import { MapPinIcon } from "@/components/leads/icons";
import { PhoneIcon } from "@/components/ui/icons";

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

type LeadRowProps = {
  lead: Lead;
  onSelect: (lead: Lead) => void;
};

function LeadRowComponent({ lead, onSelect }: LeadRowProps) {
  return (
    <tr
      onClick={() => onSelect(lead)}
      // Sem transition-colors aqui: com centenas de linhas, transicionar
      // cor em todas ao trocar de tema (não só no hover) acumula custo de
      // repaint e trava — o tema fica visivelmente atrasado só na tabela.
      className="cursor-pointer odd:bg-surface even:bg-subtle hover:bg-accent-soft"
    >
      <td className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
            {(lead.nome ?? "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{lead.nome ?? "—"}</div>
            {/* Linha sempre presente (só oculta quando não há endereço) para
                manter todas as linhas com a mesma altura — necessário para a
                virtualização abaixo calcular a posição de rolagem por índice. */}
            <div
              className={`mt-0.5 flex items-center gap-1 text-[11.5px] text-muted ${
                lead.endereco ? "" : "invisible"
              }`}
            >
              <MapPinIcon className="h-3 w-3 shrink-0 text-muted-2" />
              <span className="truncate">{lead.endereco || "—"}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="border-b border-border px-4 py-3 text-muted">
        <div className="flex items-center gap-1.5 font-mono tabular-nums">
          {lead.telefone && <PhoneIcon className="h-3 w-3 shrink-0 text-muted-2" />}
          {lead.telefone ?? "—"}
        </div>
      </td>
      <td className="border-b border-border px-4 py-3">
        <StatusChip ok={!!lead.website} labelOk="Site" labelNo="Sem site" />
      </td>
      <td className="border-b border-border px-4 py-3">
        {lead.categoria && (
          <span className="inline-flex items-center rounded-[5px] bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
            {lead.categoria}
          </span>
        )}
      </td>
      <td className="border-b border-border px-4 py-3 font-mono text-muted tabular-nums">
        {formatarData(lead.capturadoEm)}
      </td>
      <td className="border-b border-border px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <LeadActions lead={lead} />
      </td>
    </tr>
  );
}

export const LeadRow = memo(LeadRowComponent);
