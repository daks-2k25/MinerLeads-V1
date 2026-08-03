import { Module } from '@nestjs/common';
import { ScraperModule } from '../scraper/scraper.module';
import { SearchHistoryModule } from '../search-history/search-history.module';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  imports: [SearchHistoryModule, ScraperModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
