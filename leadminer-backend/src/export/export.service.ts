import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ExportLeadItemDto } from './dto/export-lead-item.dto';

const COLUNAS = [
  { header: 'Empresa', key: 'nome' },
  { header: 'Telefone', key: 'telefone' },
  { header: 'Website', key: 'website' },
  { header: 'Endereço', key: 'endereco' },
  { header: 'Cidade', key: 'cidade' },
  { header: 'Categoria', key: 'categoria' },
  { header: 'Link Maps', key: 'urlMaps' },
  { header: 'Capturado em', key: 'capturadoEm' },
] as const;

const HEADER_ROW = 4;

export interface PlanilhaGerada {
  buffer: ExcelJS.Buffer;
  nomeArquivo: string;
}

// Portado integralmente de app/api/export/route.ts (Next.js) — mesma
// planilha, formatação, colunas, autofiltro, congelamento, largura
// automática e nome de arquivo.
@Injectable()
export class ExportService {
  async generateSpreadsheet(leads: ExportLeadItemDto[]): Promise<PlanilhaGerada> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');

    const totalColunas = COLUNAS.length;

    sheet.mergeCells(1, 1, 1, totalColunas);
    const tituloCell = sheet.getCell(1, 1);
    tituloCell.value = 'LeadMiner - Lista de Leads';
    tituloCell.font = { bold: true, size: 14 };

    sheet.mergeCells(2, 1, 2, totalColunas);
    const dataCell = sheet.getCell(2, 1);
    dataCell.value = `Gerado em: ${this.formatarDataHora(new Date())}`;
    dataCell.font = { italic: true };

    const headerRow = sheet.getRow(HEADER_ROW);
    COLUNAS.forEach((coluna, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = coluna.header;
      cell.font = { bold: true };
    });

    for (const lead of leads) {
      const registro = lead as unknown as Record<string, unknown>;

      const valores = COLUNAS.map((coluna) => {
        if (coluna.key === 'capturadoEm') {
          const bruto = registro.capturadoEm;
          return typeof bruto === 'string' ? new Date(bruto) : bruto;
        }
        return registro[coluna.key];
      });

      const row = sheet.addRow(valores);

      const capturadoEmCell = row.getCell(totalColunas);
      capturadoEmCell.numFmt = 'dd/mm/yyyy hh:mm';
    }

    COLUNAS.forEach((coluna, index) => {
      const columnIndex = index + 1;
      let maiorTamanho = coluna.header.length;

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= HEADER_ROW) return;
        const tamanho = this.celulaTexto(row.getCell(columnIndex).value).length;
        maiorTamanho = Math.max(maiorTamanho, tamanho);
      });

      sheet.getColumn(columnIndex).width = Math.min(Math.max(maiorTamanho + 2, 12), 60);
    });

    sheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: totalColunas },
    };

    sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }];

    const buffer = await workbook.xlsx.writeBuffer();
    const nomeArquivo = this.gerarNomeArquivo(leads);

    return { buffer, nomeArquivo };
  }

  private formatarDataHora(data: Date): string {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
  }

  private celulaTexto(valor: unknown): string {
    if (valor instanceof Date) return this.formatarDataHora(valor);
    return valor ? String(valor) : '';
  }

  private sanitizarParaNomeArquivo(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private formatarDataArquivo(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private gerarNomeArquivo(leads: ExportLeadItemDto[]): string {
    const primeiro = leads[0];

    const partes = [primeiro?.categoria, primeiro?.cidade, this.formatarDataArquivo(new Date())]
      .map((parte) => (parte ? this.sanitizarParaNomeArquivo(parte) : null))
      .filter((parte): parte is string => Boolean(parte));

    return `leads-${partes.join('-')}.xlsx`;
  }
}
