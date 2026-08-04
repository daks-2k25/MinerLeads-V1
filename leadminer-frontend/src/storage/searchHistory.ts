import { SearchHistory } from "../models/searchHistory";
import { Lead } from "../models/lead";

let historico: SearchHistory[] = [];

let idCounter = 1;

let vinculos: {
  buscaId: number;
  leadId: number;
}[] = [];


export function registrarBuscaHistorico(
  busca: SearchHistory
): SearchHistory {

  const registro = {
    ...busca,
    id: idCounter++,
    criadoEm:
      busca.criadoEm ?? new Date().toISOString(),
  };

  historico.push(registro);

  return registro;
}


export function listarHistoricoBuscas(): SearchHistory[] {
  return [...historico].reverse();
}


export function removerHistoricoBusca(id: number) {
  historico = historico.filter(
    (item) => item.id !== id
  );

  vinculos = vinculos.filter(
    (item) => item.buscaId !== id
  );
}


export function vincularLeadsABusca(
  searchHistoryId: number,
  leadIds: number[]
) {
  for (const leadId of leadIds) {
    vinculos.push({
      buscaId: searchHistoryId,
      leadId,
    });
  }
}


export function listarLeadsDaBusca(
  searchHistoryId: number
): Lead[] {

  const ids = vinculos
    .filter(
      (item) => item.buscaId === searchHistoryId
    )
    .map(
      (item) => item.leadId
    );

  return ids.map(() => {
    return {} as Lead;
  });
}