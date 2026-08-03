/**
 * Script de teste ISOLADO da Google Places API (New).
 * Não faz parte da aplicação NestJS — apenas valida a chamada à API antes de integrar.
 *
 * Como rodar (a partir de leadminer-backend/):
 *   npx ts-node scripts/test-google-places.ts
 *
 * Termo de busca customizado (opcional, sobrepõe o padrão "dentistas Curitiba Brasil"):
 *   GOOGLE_PLACES_QUERY="mecânicas Curitiba Brasil" npx ts-node scripts/test-google-places.ts
 *
 * Pré-requisito: definir GOOGLE_PLACES_API_KEY no arquivo .env
 * (precisa ter "Places API (New)" habilitada no Google Cloud Console).
 *
 * Ao final, roda Place Details nos primeiros MAX_DETAILS_CALLS lugares encontrados
 * e mostra um relatório de completude (telefone/website/rating/horário). Nada é
 * salvo em banco — é somente uma análise impressa no console.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SEARCH_QUERY = process.env.GOOGLE_PLACES_QUERY || 'dentistas Curitiba Brasil';

interface TextSearchPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
}

interface TextSearchResponse {
  places?: TextSearchPlace[];
  nextPageToken?: string;
}

interface PlaceDetails {
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
}

const MAX_PAGES = 10; // trava de segurança contra loop infinito
const DELAY_ENTRE_PAGINAS_MS = 2000; // o nextPageToken leva um instante para ficar válido

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextSearchPage(
  query: string,
  pageToken?: string,
): Promise<TextSearchResponse> {
  const body: Record<string, unknown> = pageToken
    ? { textQuery: query, pageToken }
    : { textQuery: query };

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY as string,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,nextPageToken',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Text Search falhou (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as TextSearchResponse;
}

async function textSearchAllPages(query: string): Promise<TextSearchPlace[]> {
  const allPlaces: TextSearchPlace[] = [];
  let pageToken: string | undefined;
  let pageNumber = 1;

  do {
    console.log(`Buscando página ${pageNumber}${pageToken ? ` (token: ${pageToken.slice(0, 12)}...)` : ''}...`);

    const data = await fetchTextSearchPage(query, pageToken);
    allPlaces.push(...(data.places ?? []));
    pageToken = data.nextPageToken;
    pageNumber++;

    if (pageToken) {
      if (pageNumber > MAX_PAGES) {
        console.log(`Limite de ${MAX_PAGES} páginas atingido, parando mesmo havendo nextPageToken.`);
        break;
      }
      await delay(DELAY_ENTRE_PAGINAS_MS);
    }
  } while (pageToken);

  return allPlaces;
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': API_KEY as string,
      'X-Goog-FieldMask': 'internationalPhoneNumber,websiteUri,rating,regularOpeningHours',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Place Details falhou (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as PlaceDetails;
}

const MAX_DETAILS_CALLS = 20; // trava para evitar chamadas excessivas de Place Details
const DELAY_ENTRE_DETAILS_MS = 200;

function pct(count: number, total: number): string {
  return total === 0 ? '0.0' : ((count / total) * 100).toFixed(1);
}

async function analyzeLeadsCompleteness(places: TextSearchPlace[]): Promise<void> {
  const placesToAnalyze = places.slice(0, MAX_DETAILS_CALLS);

  if (places.length > placesToAnalyze.length) {
    console.log(
      `\nLimite de ${MAX_DETAILS_CALLS} chamadas de Place Details atingido — analisando apenas os primeiros ${placesToAnalyze.length} de ${places.length} lugares.`,
    );
  }

  let comTelefone = 0;
  let comWebsite = 0;
  let comRating = 0;
  let comHorario = 0;

  for (const [index, place] of placesToAnalyze.entries()) {
    console.log(
      `Place Details ${index + 1}/${placesToAnalyze.length} (id: ${place.id})...`,
    );
    const details = await getPlaceDetails(place.id);

    if (details.internationalPhoneNumber) comTelefone++;
    if (details.websiteUri) comWebsite++;
    if (typeof details.rating === 'number') comRating++;
    if (details.regularOpeningHours?.weekdayDescriptions?.length) comHorario++;

    if (index < placesToAnalyze.length - 1) {
      await delay(DELAY_ENTRE_DETAILS_MS);
    }
  }

  const total = placesToAnalyze.length;
  console.log(`\n=== Relatório de completude dos leads (${total} analisados) ===\n`);
  console.log(`Com telefone: ${comTelefone}/${total} (${pct(comTelefone, total)}%)`);
  console.log(`Com website: ${comWebsite}/${total} (${pct(comWebsite, total)}%)`);
  console.log(`Com rating: ${comRating}/${total} (${pct(comRating, total)}%)`);
  console.log(`Com horário de funcionamento: ${comHorario}/${total} (${pct(comHorario, total)}%)`);
}

async function main() {
  if (!API_KEY) {
    console.error(
      'GOOGLE_PLACES_API_KEY não encontrada no .env. Defina a variável antes de rodar o script.',
    );
    process.exit(1);
  }

  console.log(`\n=== Text Search com paginação: "${SEARCH_QUERY}" ===\n`);
  const places = await textSearchAllPages(SEARCH_QUERY);

  console.log(`\nTotal de lugares encontrados: ${places.length}\n`);

  if (places.length === 0) {
    console.log('Nenhum resultado encontrado.');
    return;
  }

  for (const place of places) {
    console.log({
      nome: place.displayName?.text,
      endereco: place.formattedAddress,
    });
  }

  const uniqueIds = new Set(places.map((place) => place.id));
  console.log(`\nQuantidade de IDs únicos: ${uniqueIds.size}`);

  await analyzeLeadsCompleteness(places);
}

main().catch((error) => {
  console.error('Erro ao executar o teste:', error);
  process.exit(1);
});
