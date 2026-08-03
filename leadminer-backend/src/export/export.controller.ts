import { Body, Controller, Post } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportLeadsDto } from './dto/export-leads.dto';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  export(@Body() dto: ExportLeadsDto) {
    return this.exportService.generateSpreadsheet(dto);
  }
}
