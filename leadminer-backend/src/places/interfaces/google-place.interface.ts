export interface GooglePlace {
  placeId: string;
  nome: string;
  endereco: string;
  telefone?: string;
  website?: string;
  rating?: number;
  horarioFuncionamento?: string[];
  googleMapsUri?: string;
  // Indica se o lead veio de uma chamada nova à Google (true) ou foi
  // reaproveitado do banco via cache por placeId (false). Preparado para
  // suportar o futuro filtro `mostrarSomenteNovos` do SearchPlaceDto.
  isNovo?: boolean;
}
