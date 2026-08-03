import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegisterSearchHistoryDto {
  @IsString()
  @IsNotEmpty()
  termoBusca: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  bairro?: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsInt()
  @Min(0)
  quantidadeLeads: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantidadeNovos?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantidadeCache?: number;
}
