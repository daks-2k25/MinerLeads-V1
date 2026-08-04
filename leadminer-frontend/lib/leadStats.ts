import { Lead } from "@/src/models/lead";

export interface LeadStats {
  total: number;
  comTelefone: number;
  comSite: number;
  cidadeEmFoco: string;
}

export function deriveLeadStats(leads: Lead[]): LeadStats {
  const comTelefone = leads.filter((lead) => !!lead.telefone).length;
  const comSite = leads.filter((lead) => !!lead.website).length;

  const contagemPorCidade = new Map<string, number>();
  for (const lead of leads) {
    if (!lead.cidade) continue;
    contagemPorCidade.set(lead.cidade, (contagemPorCidade.get(lead.cidade) ?? 0) + 1);
  }

  let cidadeEmFoco = "—";
  let maiorContagem = 0;
  for (const [cidade, contagem] of contagemPorCidade) {
    if (contagem > maiorContagem) {
      cidadeEmFoco = cidade;
      maiorContagem = contagem;
    }
  }

  return {
    total: leads.length,
    comTelefone,
    comSite,
    cidadeEmFoco,
  };
}
