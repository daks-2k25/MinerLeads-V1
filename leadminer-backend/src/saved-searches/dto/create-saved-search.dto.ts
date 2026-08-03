import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSavedSearchDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

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
}
