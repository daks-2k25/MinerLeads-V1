import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import type { BuscaAtualResultado, CancelarBuscaResultado } from './scraper.service';
import { StartScraperDto } from './dto/start-scraper.dto';
import { ScrapedLead } from './interfaces/scraped-lead.interface';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  start(@Body() dto: StartScraperDto): Promise<ScrapedLead[]> {
    return this.scraperService.start(dto);
  }

  // Rota estática ('atual'), sem conflito com a rota dinâmica
  // (':searchId/cancel') abaixo: são métodos HTTP diferentes (GET vs POST),
  // então o Nest nunca tentaria casar 'atual' como :searchId.
  @Get('atual')
  buscaAtual(): BuscaAtualResultado {
    return this.scraperService.getBuscaAtual();
  }

  @Post(':searchId/cancel')
  cancelar(@Param('searchId') searchId: string): CancelarBuscaResultado {
    return this.scraperService.cancelar(searchId);
  }
}
