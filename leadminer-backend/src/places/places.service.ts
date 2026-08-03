import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SearchHistoryService } from '../search-history/search-history.service';
import { SearchPlaceDto } from './dto/search-place.dto';
import { GooglePlace } from './interfaces/google-place.interface';

interface TextSearchPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
}

interface TextSearchResponse {
  places?: TextSearchPlace[];
  nextPageToken?: string;
}

interface PlaceDetailsResponse {
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  googleMapsUri?: string;
}

type PlaceSummary = Pick<GooglePlace, 'placeId' | 'nome' | 'endereco'>;

const MAX_PAGES = 10; // trava de segurança contra loop infinito na Text Search
const DELAY_ENTRE_PAGINAS_MS = 2000; // o nextPageToken leva um instante para ficar válido
const DETAILS_CONCURRENCY_LIMIT = 5; // limite de chamadas simultâneas de Place Details

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Executa `mapper` para cada item de `items`, no máximo `limit` chamadas em paralelo,
// preservando a ordem original dos resultados.
async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return results;
}

@Injectable()
export class PlacesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  // Reaproveita a lógica de paginação validada em scripts/test-google-places.ts.
  async searchPlaces(dto: SearchPlaceDto): Promise<GooglePlace[]> {
    const apiKey = this.getApiKeyOrThrow();
    const query = `${dto.termoBusca} ${dto.cidade} Brasil`;

    const textSearchPlaces = await this.textSearchAllPages(query, apiKey);
    const summaries: PlaceSummary[] = textSearchPlaces.map((place) => ({
      placeId: place.id,
      nome: place.displayName?.text ?? '',
      endereco: place.formattedAddress ?? '',
    }));

    const results = await mapWithConcurrencyLimit(
      summaries,
      DETAILS_CONCURRENCY_LIMIT,
      (summary) => this.getOrCreateLead(summary, dto),
    );

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

  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse> {
    const apiKey = this.getApiKeyOrThrow();

    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'internationalPhoneNumber,websiteUri,rating,regularOpeningHours,googleMapsUri',
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Place Details falhou (${response.status}): ${errorBody}`,
      );
    }

    return (await response.json()) as PlaceDetailsResponse;
  }

  // Converte o resumo da Text Search + os detalhes do Place Details (formatos
  // crus da Google) para o modelo de lead da aplicação (GooglePlace).
  mapPlaceToLead(
    summary: PlaceSummary,
    details: PlaceDetailsResponse,
  ): GooglePlace {
    return {
      placeId: summary.placeId,
      nome: summary.nome,
      endereco: summary.endereco,
      telefone: details.internationalPhoneNumber,
      website: details.websiteUri,
      rating: details.rating,
      horarioFuncionamento: details.regularOpeningHours?.weekdayDescriptions,
      googleMapsUri: details.googleMapsUri,
    };
  }

  // Cache por placeId: reaproveita o Lead já salvo (sem gastar cota de Place
  // Details) quando ele já existe; caso contrário, busca na Google e persiste.
  private async getOrCreateLead(
    summary: PlaceSummary,
    dto: SearchPlaceDto,
  ): Promise<GooglePlace> {
    const cachedLead = await this.prisma.lead.findUnique({
      where: { placeId: summary.placeId },
    });
    if (cachedLead) {
      return {
        placeId: cachedLead.placeId,
        nome: cachedLead.nome ?? summary.nome,
        endereco: cachedLead.endereco ?? summary.endereco,
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

    const details = await this.getPlaceDetails(summary.placeId);
    const lead = this.mapPlaceToLead(summary, details);
    const urlMaps = this.buildGoogleMapsUrl(summary.placeId);

    await this.prisma.lead.create({
      data: {
        placeId: lead.placeId,
        nome: lead.nome || null,
        telefone: lead.telefone ?? null,
        website: lead.website ?? null,
        endereco: lead.endereco || null,
        cidade: dto.cidade,
        categoria: dto.categoria,
        urlMaps,
        rating: lead.rating ?? null,
        openingHours: lead.horarioFuncionamento
          ? JSON.stringify(lead.horarioFuncionamento)
          : null,
        capturadoEm: new Date(),
      },
    });

    return { ...lead, isNovo: true };
  }

  // Formato canônico e determinístico: sempre o mesmo urlMaps para o mesmo
  // placeId, usado apenas para exibição/exportação (a chave de cache é placeId).
  private buildGoogleMapsUrl(placeId: string): string {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  }

  private getApiKeyOrThrow(): string {
    const apiKey = this.configService.get<string>('googlePlaces.apiKey');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY não configurada.');
    }
    return apiKey;
  }

  private async textSearchAllPages(
    query: string,
    apiKey: string,
  ): Promise<TextSearchPlace[]> {
    const allPlaces: TextSearchPlace[] = [];
    let pageToken: string | undefined;
    let pageNumber = 1;

    do {
      const data = await this.fetchTextSearchPage(query, apiKey, pageToken);
      allPlaces.push(...(data.places ?? []));
      pageToken = data.nextPageToken;
      pageNumber++;

      if (pageToken) {
        if (pageNumber > MAX_PAGES) {
          break;
        }
        await delay(DELAY_ENTRE_PAGINAS_MS);
      }
    } while (pageToken);

    return allPlaces;
  }

  private async fetchTextSearchPage(
    query: string,
    apiKey: string,
    pageToken?: string,
  ): Promise<TextSearchResponse> {
    const body: Record<string, unknown> = pageToken
      ? { textQuery: query, pageToken }
      : { textQuery: query };

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,nextPageToken',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Text Search falhou (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as TextSearchResponse;
  }
}
