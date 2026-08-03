export class UltimaPesquisaDto {
  id: number;
  termoBusca: string;
  cidade: string | null;
  categoria: string | null;
  quantidadeLeads: number;
  quantidadeNovos: number;
  quantidadeCache: number;
  status: string;
  createdAt: Date;
}

export class CategoriaMaisPesquisadaDto {
  categoria: string;
  totalPesquisas: number;
}

export class DashboardMetricsDto {
  totalLeads: number;
  totalPesquisas: number;
  totalLeadsNovos: number;
  totalLeadsCache: number;
  ultimasPesquisas: UltimaPesquisaDto[];
  categoriasMaisPesquisadas: CategoriaMaisPesquisadaDto[];
}
