import { Body, Controller, Post } from '@nestjs/common';
import { PlacesService } from './places.service';
import { SearchPlaceDto } from './dto/search-place.dto';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post('search')
  async search(@Body() dto: SearchPlaceDto) {
    return this.placesService.searchPlaces(dto);
  }
}
