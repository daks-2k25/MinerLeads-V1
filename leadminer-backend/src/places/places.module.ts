import { Module } from '@nestjs/common';
import { SearchHistoryModule } from '../search-history/search-history.module';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  imports: [SearchHistoryModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
