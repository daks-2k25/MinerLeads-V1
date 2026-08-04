import { Body, Controller, Post } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { StartScraperDto } from './dto/start-scraper.dto';
import { ScrapedLead } from './interfaces/scraped-lead.interface';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  start(@Body() dto: StartScraperDto): Promise<ScrapedLead[]> {
    return this.scraperService.start(dto);
  }
}
