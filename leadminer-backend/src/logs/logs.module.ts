import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';

@Module({
  // Sem controller HTTP por enquanto — uso interno pelos outros módulos.
  // Pode ganhar um LogsController (ex.: GET /logs) no futuro, se virar
  // painel de auditoria.
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
