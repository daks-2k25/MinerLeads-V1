import { Lead } from "../models/lead";

let leads: Lead[] = [];

let idCounter = 1;

export function inserirLead(lead: Lead) {
  const existe = leads.some(
    (item) => item.urlMaps === lead.urlMaps
  );

  if (existe) return;

  leads.push({
    ...lead,
    id: idCounter++,
  } as Lead);
}

export function adicionarLeads(novosLeads: Lead[]) {
  for (const lead of novosLeads) {
    inserirLead(lead);
  }
}

export function listarLeads(): Lead[] {
  return [...leads].reverse();
}

export function buscarIdsPorUrlMaps(
  urls: string[]
): { id: number; urlMaps: string }[] {
  return leads
    .filter((lead) => urls.includes(lead.urlMaps))
    .map((lead) => ({
      id: Number(lead.id),
      urlMaps: lead.urlMaps,
    }));
}