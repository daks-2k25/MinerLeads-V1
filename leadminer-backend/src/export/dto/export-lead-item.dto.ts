import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExportLeadItemDto {
  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  nome?: string | null;

  @IsOptional()
  @IsString()
  telefone?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  endereco?: string | null;

  @IsString()
  @IsNotEmpty()
  cidade: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsString()
  @IsNotEmpty()
  urlMaps: string;

  @IsISO8601()
  capturadoEm: string;
}
