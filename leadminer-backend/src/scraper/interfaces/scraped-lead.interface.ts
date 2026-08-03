export interface ScrapedLead {
  placeId: string | null;
  nome: string | null;
  telefone: string | null;
  website: string | null;
  endereco: string | null;
  urlMaps: string;
  isCached: boolean;
  cachedLeadId: number | null;
}
