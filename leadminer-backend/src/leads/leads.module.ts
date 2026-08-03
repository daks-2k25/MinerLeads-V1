import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
  // Exportado porque SearchHistoryModule precisará consultar leads
  // (join busca -> leads) quando a migração funcional acontecer.
  exports: [LeadsService],
})
export class LeadsModule {}
