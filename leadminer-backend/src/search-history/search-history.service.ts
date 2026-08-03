import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterSearchHistoryDto } from './dto/register-search-history.dto';

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implementar via Prisma na migração funcional deste módulo
  // (ver docs/MIGRACAO-NESTJS.md, etapa 5 e 8 do plano).
  //
  // ATENÇÃO: findLeadsByHistoryId deve fazer o join real com LeadsService.
  // No projeto atual essa função tem uma regressão conhecida (retorna leads
  // vazios) introduzida no commit dec5c0d — corrigir aqui, não repetir.
  findAll(): never {
    throw new NotImplementedException();
  }

  register(dto: RegisterSearchHistoryDto) {
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

  remove(_id: number): never {
    throw new NotImplementedException();
  }

  findLeadsByHistoryId(_id: number): never {
    throw new NotImplementedException();
  }
}
