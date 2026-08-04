import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SearchHistory } from '../../generated/prisma/client';
import { LeadsService } from '../leads/leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterSearchHistoryDto } from './dto/register-search-history.dto';
import { SearchHistoryResponseDto } from './dto/search-history-response.dto';

@Injectable()
export class SearchHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  async findAll(): Promise<SearchHistoryResponseDto[]> {
    const historico = await this.prisma.searchHistory.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return historico.map((item) => this.toResponseDto(item));
  }

  register(dto: RegisterSearchHistoryDto): Promise<SearchHistory> {
    return this.prisma.searchHistory.create({
      data: {
        termoBusca: dto.termoBusca,
        cidade: dto.cidade ?? null,
        bairro: dto.bairro ?? null,
        categoria: dto.categoria ?? null,
        quantidadeLeads: dto.quantidadeLeads,
        quantidadeNovos: dto.quantidadeNovos ?? 0,
        quantidadeCache: dto.quantidadeCache ?? 0,
        status: 'COMPLETED',
      },
    });
  }

  // skipDuplicates evita erro de constraint se a mesma empresa (mesmo
  // leadId) aparecer mais de uma vez nos resultados de uma busca.
  async linkLeads(searchHistoryId: number, leadIds: number[]): Promise<void> {
    if (leadIds.length === 0) return;

    await this.prisma.searchHistoryLead.createMany({
      data: leadIds.map((leadId) => ({ searchHistoryId, leadId })),
      skipDuplicates: true,
    });
  }

  // Apaga primeiro os vínculos em search_history_leads (a FK de lead é
  // onDelete: Restrict, então um lead vinculado nunca é apagado por tabela;
  // só o vínculo é) para só então remover a busca em si.
  async remove(id: number): Promise<{ ok: true }> {
    try {
      await this.prisma.$transaction([
        this.prisma.searchHistoryLead.deleteMany({
          where: { searchHistoryId: id },
        }),
        this.prisma.searchHistory.delete({ where: { id } }),
      ]);
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        throw new NotFoundException(`Busca ${id} não encontrada`);
      }

      throw erro;
    }

    return { ok: true };
  }

  async findLeadsByHistoryId(id: number) {
    const vinculos = await this.prisma.searchHistoryLead.findMany({
      where: { searchHistoryId: id },
      select: { leadId: true },
    });

    return this.leadsService.findByIds(vinculos.map((vinculo) => vinculo.leadId));
  }

  private toResponseDto(historico: SearchHistory): SearchHistoryResponseDto {
    return {
      id: historico.id,
      termoBusca: historico.termoBusca,
      cidade: historico.cidade ?? '',
      bairro: historico.bairro ?? '',
      categoria: historico.categoria ?? '',
      quantidadeLeads: historico.quantidadeLeads,
      criadoEm: historico.createdAt.toISOString(),
    };
  }
}
