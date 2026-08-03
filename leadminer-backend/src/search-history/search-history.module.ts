import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { SearchHistoryController } from './search-history.controller';
import { SearchHistoryService } from './search-history.service';

@Module({
  // LeadsModule importado desde já porque, na migração funcional, o join
  // busca -> leads (findLeadsByHistoryId) depende de LeadsService.
  imports: [LeadsModule],
  controllers: [SearchHistoryController],
  providers: [SearchHistoryService],
  exports: [SearchHistoryService],
})
export class SearchHistoryModule {}
