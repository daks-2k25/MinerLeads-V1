import { Injectable } from '@nestjs/common';

export type LogLevel = 'info' | 'warn' | 'error';

@Injectable()
export class LogsService {
  // TODO: persistir via Prisma na migração funcional deste módulo
  // (ver docs/MIGRACAO-NESTJS.md, etapa 4 do plano). Injetado nos demais
  // módulos (especialmente ScraperModule) em vez de importado como função solta.
  register(
    _level: LogLevel,
    _origin: string,
    _message: string,
    _context?: Record<string, unknown>,
    _searchId?: number,
  ): void {
    // Estrutura apenas — sem persistência ainda.
  }
}
