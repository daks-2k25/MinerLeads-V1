export class LeadResponseDto {
  id: number;
  placeId: string;
  nome: string | null;
  telefone: string | null;
  website: string | null;
  endereco: string | null;
  cidade: string;
  categoria: string;
  urlMaps: string;
  capturadoEm: string;
}
