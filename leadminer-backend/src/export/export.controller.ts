import { Body, Controller, ParseArrayPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportLeadItemDto } from './dto/export-lead-item.dto';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  async export(
    // Aceita um array puro no body (contrato já usado pelo frontend, sem
    // envelope { leads: [...] }). whitelist:true remove silenciosamente
    // campos não declarados no DTO (id, placeId, isCached, cachedLeadId
    // etc.) em vez de rejeitar a requisição.
    @Body(new ParseArrayPipe({ items: ExportLeadItemDto, whitelist: true }))
    leads: ExportLeadItemDto[],
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nomeArquivo } = await this.exportService.generateSpreadsheet(leads);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    });
    res.send(buffer);
  }
}
