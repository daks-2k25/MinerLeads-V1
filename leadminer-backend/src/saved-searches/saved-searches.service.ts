import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';

@Injectable()
export class SavedSearchesService {
  // TODO: implementar via Prisma na migração funcional deste módulo
  // (ver docs/MIGRACAO-NESTJS.md, etapa 2 do plano — único domínio que já
  // persiste corretamente hoje via node:sqlite).
  findAll(): never {
    throw new NotImplementedException();
  }

  create(_dto: CreateSavedSearchDto): never {
    throw new NotImplementedException();
  }

  remove(_id: number): never {
    throw new NotImplementedException();
  }
}
