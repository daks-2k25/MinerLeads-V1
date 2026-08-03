import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from '../scraper/scraper.service';
import { ScrapedLead } from '../scraper/interfaces/scraped-lead.interface';
import { SearchHistoryService } from '../search-history/search-history.service';
import { SearchPlaceDto } from './dto/search-place.dto';
import { GooglePlace } from './interfaces/google-place.interface';

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  // Etapa 3 da migração Google Places API -> Playwright: a origem dos dados
  // passa a ser o ScraperService (Playwright), não mais a Google Places API.
  // Cache por placeId, SearchHistory e mostrarSomenteNovos permanecem
  // exatamente como estavam — só a fonte dos dados mudou.
  async searchPlaces(dto: SearchPlaceDto): Promise<GooglePlace[]> {
    const empresasEncontradas = await this.scraperService.start(dto);

    const results: GooglePlace[] = [];
    for (const empresa of empresasEncontradas) {
      // Sem identificador estável extraído da URL não há como aplicar o
      // cache por placeId (coluna única no schema) — a empresa é ignorada.
      if (!empresa.placeId) continue;
      results.push(await this.getOrCreateLead(empresa.placeId, empresa, dto));
    }

    const quantidadeNovos = results.filter((lead) => lead.isNovo).length;
    const quantidadeCache = results.length - quantidadeNovos;

    await this.searchHistoryService.register({
      termoBusca: dto.termoBusca,
      cidade: dto.cidade,
      categoria: dto.categoria,
      quantidadeLeads: results.length,
      quantidadeNovos,
      quantidadeCache,
    });

    return dto.mostrarSomenteNovos
      ? results.filter((lead) => lead.isNovo)
      : results;
  }

  // Cache por placeId: reaproveita o Lead já salvo quando ele já existe;
  // caso contrário, persiste os dados já extraídos pelo scraper (o
  // Playwright já visita a página de detalhe da empresa, então não há uma
  // segunda chamada de "detalhes" a fazer aqui, diferente do fluxo antigo
  // com a Google Places API).
  private async getOrCreateLead(
    placeId: string,
    empresa: ScrapedLead,
    dto: SearchPlaceDto,
  ): Promise<GooglePlace> {
    const cachedLead = await this.prisma.lead.findUnique({
      where: { placeId },
    });
    if (cachedLead) {
      return {
        placeId: cachedLead.placeId,
        nome: cachedLead.nome ?? empresa.nome ?? '',
        endereco: cachedLead.endereco ?? empresa.endereco ?? '',
        telefone: cachedLead.telefone ?? undefined,
        website: cachedLead.website ?? undefined,
        rating: cachedLead.rating ?? undefined,
        horarioFuncionamento: cachedLead.openingHours
          ? JSON.parse(cachedLead.openingHours)
          : undefined,
        googleMapsUri: cachedLead.urlMaps,
        isNovo: false,
      };
    }

    const lead: GooglePlace = {
      placeId,
      nome: empresa.nome ?? '',
      endereco: empresa.endereco ?? '',
      telefone: empresa.telefone ?? undefined,
      website: empresa.website ?? undefined,
      googleMapsUri: empresa.urlMaps,
    };

    await this.prisma.lead.create({
      data: {
        placeId: lead.placeId,
        nome: lead.nome || null,
        telefone: lead.telefone ?? null,
        website: lead.website ?? null,
        endereco: lead.endereco || null,
        cidade: dto.cidade,
        categoria: dto.categoria,
        urlMaps: empresa.urlMaps,
        // O scraper não extrai rating/openingHours (a página de detalhe do
        // Google Maps scrapeada não expõe esses dados hoje) — persiste null
        // em vez de inventar um valor.
        rating: null,
        openingHours: null,
        capturadoEm: new Date(),
      },
    });

    return { ...lead, isNovo: true };
  }
}
