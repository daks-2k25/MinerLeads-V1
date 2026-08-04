import { Lead } from "@/src/models/lead";
import { StatusChip } from "@/components/leads/StatusChip";
import { LeadActions } from "@/components/leads/LeadActions";
import { MapPinIcon } from "@/components/leads/icons";

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

export function LeadRow({ lead, onSelect }: LeadRowProps) {
  return (
    <tr
      onClick={() => onSelect(lead)}
      className="cursor-pointer odd:bg-surface even:bg-subtle transition-colors hover:bg-accent-soft"
    >
      <td className="border-b border-border px-4 py-3">
        <div className="font-semibold text-foreground">{lead.nome ?? "—"}</div>
        {lead.endereco && (
          <div className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
            <MapPinIcon className="h-3 w-3 shrink-0 text-muted-2" />
            {lead.endereco}
          </div>
        )}
      </td>
      <td className="border-b border-border px-4 py-3 font-mono text-muted tabular-nums">
        {lead.telefone ?? "—"}
      </td>
      <td className="border-b border-border px-4 py-3">
        <StatusChip ok={!!lead.website} labelOk="Site" labelNo="Sem site" />
      </td>
      <td className="border-b border-border px-4 py-3 text-foreground">{lead.categoria}</td>
      <td className="border-b border-border px-4 py-3 font-mono text-muted tabular-nums">
        {formatarData(lead.capturadoEm)}
      </td>
      <td className="border-b border-border px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <LeadActions lead={lead} />
      </td>
    </tr>
  );
}
