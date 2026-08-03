import { Injectable, NotImplementedException } from '@nestjs/common';
import { StartScraperDto } from './dto/start-scraper.dto';

@Injectable()
export class ScraperService {
  // TODO: orquestração do Playwright (equivalente a src/scraper/service.ts
  // do projeto atual) será implementada na migração funcional deste módulo
  // (ver docs/MIGRACAO-NESTJS.md, etapa 6/7 do plano — inclui decisão sobre
  // transporte de progresso em tempo real e lock de concorrência real).
  start(_dto: StartScraperDto): never {
    throw new NotImplementedException();
  }
}
