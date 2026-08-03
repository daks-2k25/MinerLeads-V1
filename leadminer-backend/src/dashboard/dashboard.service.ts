import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto';

const ULTIMAS_PESQUISAS_LIMIT = 10;
const CATEGORIAS_MAIS_PESQUISADAS_LIMIT = 10;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<DashboardMetricsDto> {
    const [totalLeads, totalPesquisas, somaLeads, ultimasPesquisas, categoriasAgrupadas] =
      await Promise.all([
        this.prisma.lead.count(),
        this.prisma.searchHistory.count(),
        this.prisma.searchHistory.aggregate({
          _sum: { quantidadeNovos: true, quantidadeCache: true },
        }),
        this.prisma.searchHistory.findMany({
          orderBy: { createdAt: 'desc' },
          take: ULTIMAS_PESQUISAS_LIMIT,
          select: {
            id: true,
            termoBusca: true,
            cidade: true,
            categoria: true,
            quantidadeLeads: true,
            quantidadeNovos: true,
            quantidadeCache: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.searchHistory.groupBy({
          by: ['categoria'],
          where: { categoria: { not: null } },
          _count: { categoria: true },
          orderBy: { _count: { categoria: 'desc' } },
          take: CATEGORIAS_MAIS_PESQUISADAS_LIMIT,
        }),
      ]);

    return {
      totalLeads,
      totalPesquisas,
      totalLeadsNovos: somaLeads._sum.quantidadeNovos ?? 0,
      totalLeadsCache: somaLeads._sum.quantidadeCache ?? 0,
      ultimasPesquisas,
      categoriasMaisPesquisadas: categoriasAgrupadas.map((item) => ({
        categoria: item.categoria as string,
        totalPesquisas: item._count.categoria,
      })),
    };
  }
}
