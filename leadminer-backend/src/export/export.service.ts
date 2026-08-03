import { Injectable, NotImplementedException } from '@nestjs/common';
import { ExportLeadsDto } from './dto/export-leads.dto';

@Injectable()
export class ExportService {
  // TODO: portar a geração do .xlsx (ExcelJS) na migração funcional deste
  // módulo (ver docs/MIGRACAO-NESTJS.md, etapa 3 do plano).
  generateSpreadsheet(_dto: ExportLeadsDto): never {
    throw new NotImplementedException();
  }
}
