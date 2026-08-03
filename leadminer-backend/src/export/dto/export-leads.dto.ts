import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ExportLeadItemDto } from './export-lead-item.dto';

export class ExportLeadsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ExportLeadItemDto)
  leads: ExportLeadItemDto[];
}
