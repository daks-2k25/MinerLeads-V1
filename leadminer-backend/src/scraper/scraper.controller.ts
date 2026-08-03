import { Body, Controller, Post } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { StartScraperDto } from './dto/start-scraper.dto';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  start(@Body() dto: StartScraperDto) {
    return this.scraperService.start(dto);
  }
}
