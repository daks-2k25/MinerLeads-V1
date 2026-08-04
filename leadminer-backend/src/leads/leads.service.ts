import { Injectable, NotFoundException } from '@nestjs/common';
import { Lead } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeadResponseDto } from './dto/lead-response.dto';

export interface UpsertLeadByPlaceIdData {
  placeId: string;
  nome: string | null;
  telefone: string | null;
  website: string | null;
  endereco: string | null;
  cidade: string;
  categoria: string;
  urlMaps: string;
  capturadoEm: Date;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<LeadResponseDto[]> {
    const leads = await this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toResponseDto(lead));
  }

  async findOne(id: number): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} não encontrado`);
    }

    return this.toResponseDto(lead);
  }

  findByPlaceId(placeId: string) {
    return this.prisma.lead.findUnique({ where: { placeId } });
  }

  async findByIds(ids: number[]): Promise<LeadResponseDto[]> {
    if (ids.length === 0) return [];

    const leads = await this.prisma.lead.findMany({
      where: { id: { in: ids } },
    });

    return leads.map((lead) => this.toResponseDto(lead));
  }

  upsertByPlaceId(data: UpsertLeadByPlaceIdData) {
    const { placeId, ...campos } = data;

    return this.prisma.lead.upsert({
      where: { placeId },
      create: { placeId, ...campos },
      update: campos,
    });
  }

  private toResponseDto(lead: Lead): LeadResponseDto {
    return {
      id: lead.id,
      placeId: lead.placeId,
      nome: lead.nome,
      telefone: lead.telefone,
      website: lead.website,
      endereco: lead.endereco,
      cidade: lead.cidade,
      categoria: lead.categoria,
      urlMaps: lead.urlMaps,
      capturadoEm: lead.capturadoEm.toISOString(),
    };
  }
}
