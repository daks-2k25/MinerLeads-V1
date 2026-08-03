import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class LeadsService {
  // TODO: implementar via Prisma na migração funcional deste módulo
  // (ver docs/MIGRACAO-NESTJS.md, etapa 3 do plano).
  findAll(): never {
    throw new NotImplementedException();
  }

  findOne(_id: number): never {
    throw new NotImplementedException();
  }
}
