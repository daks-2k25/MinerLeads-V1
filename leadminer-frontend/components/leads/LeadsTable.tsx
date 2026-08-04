import { Lead } from "@/src/models/lead";
import { Panel } from "@/components/ui/Panel";
import { LeadRow } from "@/components/leads/LeadRow";

type LeadsTableProps = {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
};

export function LeadsTable({ leads, onSelectLead }: LeadsTableProps) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-[13.5px] font-bold text-foreground">
          Leads
          <span className="ml-1.5 text-[12px] font-normal text-muted">
            {leads.length} resultados
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead>
            <tr>
              {["Empresa", "Telefone", "Site", "Categoria", "Capturado em", "Ações"].map((titulo) => (
                <th
                  key={titulo}
                  className="sticky top-0 border-b border-border bg-surface px-4 py-2.5 text-left text-[10.5px] font-bold tracking-wide text-muted-2 uppercase"
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <LeadRow key={lead.urlMaps} lead={lead} onSelect={onSelectLead} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
