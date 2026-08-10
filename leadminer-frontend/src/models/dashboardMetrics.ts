export interface UltimaPesquisa {
  id: number;
  termoBusca: string;
  cidade: string | null;
  categoria: string | null;
  quantidadeLeads: number;
  quantidadeNovos: number;
  quantidadeCache: number;
  status: string;
  createdAt: string;
}

export interface CategoriaMaisPesquisada {
  categoria: string;
  totalPesquisas: number;
}

export interface DashboardMetrics {
  totalLeads: number;
  totalPesquisas: number;
  totalLeadsNovos: number;
  totalLeadsCache: number;
  chamadasEvitadasCache: number;
  ultimasPesquisas: UltimaPesquisa[];
  categoriasMaisPesquisadas: CategoriaMaisPesquisada[];
}
