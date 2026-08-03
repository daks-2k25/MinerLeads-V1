import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchPlaceDto {
  @IsString()
  @IsNotEmpty()
  termoBusca: string;

  @IsString()
  @IsNotEmpty()
  cidade: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  // Quando true, a resposta traz somente leads com isNovo=true (recém-criados
  // nesta busca), filtrando os que já existiam no banco (cache por placeId).
  @IsBoolean()
  @IsOptional()
  mostrarSomenteNovos?: boolean;
}
