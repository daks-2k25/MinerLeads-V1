import { Lead } from "../models/lead";

const leadsPorUrl = new Map<string, Lead>();

export function inserirLead(lead: Lead) {
  if (!leadsPorUrl.has(lead.urlMaps)) {
    leadsPorUrl.set(lead.urlMaps, lead);
  }
}

export function adicionarLeads(novosLeads: Lead[]) {
  for (const lead of novosLeads) {
    inserirLead(lead);
  }
}

export function listarLeads(): Lead[] {
  return Array.from(leadsPorUrl.values()).reverse();
}
