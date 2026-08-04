import { Injectable } from '@nestjs/common';
import { SavedSearch } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { SavedSearchResponseDto } from './dto/saved-search-response.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SavedSearchResponseDto[]> {
    const buscas = await this.prisma.savedSearch.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return buscas.map((busca) => this.toResponseDto(busca));
  }

  async create(dto: CreateSavedSearchDto): Promise<SavedSearchResponseDto> {
    const busca = await this.prisma.savedSearch.create({
      data: {
        nome: dto.nome,
        termoBusca: dto.termoBusca,
        cidade: dto.cidade ?? null,
        bairro: dto.bairro ?? null,
        categoria: dto.categoria ?? null,
      },
    });

    return this.toResponseDto(busca);
  }

  // Mesmo comportamento do sistema legado (SQLite): DELETE é idempotente.
  // deleteMany não lança erro quando nenhum registro bate com o where —
  // ao contrário de delete(), que lançaria P2025 para id inexistente.
  async remove(id: number): Promise<{ ok: true }> {
    await this.prisma.savedSearch.deleteMany({ where: { id } });

    return { ok: true };
  }

  private toResponseDto(busca: SavedSearch): SavedSearchResponseDto {
    return {
      id: busca.id,
      nome: busca.nome,
      termoBusca: busca.termoBusca,
      cidade: busca.cidade ?? '',
      bairro: busca.bairro ?? '',
      categoria: busca.categoria ?? '',
      criadoEm: busca.createdAt.toISOString(),
    };
  }
}
