import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { SearchHistoryModule } from '../search-history/search-history.module';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [LeadsModule, SearchHistoryModule],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
