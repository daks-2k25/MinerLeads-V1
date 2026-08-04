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

  // Sem @IsNotEmpty(): leads antigos podem ter sido persistidos com cidade/
  // categoria vazias (a rota antiga do Next.js nunca validava isso) — o
  // campo continua exigido como string, só não pode mais rejeitar "".
  @IsString()
  cidade: string;

  @IsString()
  categoria: string;

  @IsString()
  @IsNotEmpty()
  urlMaps: string;

  @IsISO8601()
  capturadoEm: string;
}
