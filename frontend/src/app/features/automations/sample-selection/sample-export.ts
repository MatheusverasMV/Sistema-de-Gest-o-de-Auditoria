import { SampleSelectionResult } from '../../../core/models';

/**
 * Gera a amostra como CSV (separador ";" e BOM UTF-8, para abrir corretamente no Excel pt-BR).
 * No protótipo substitui a geração do .xlsx, que ficará a cargo do backend.
 */
export function downloadSampleCsv(result: SampleSelectionResult, fileBaseName: string): void {
  const header = ['Documento', 'Data', 'Conta', 'Descrição', 'Valor', 'Critério'];
  const lines = result.items.map((item) =>
    [
      item.document,
      item.date.split('-').reverse().join('/'),
      item.account,
      item.description,
      item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      item.reason,
    ]
      .map((cell) => `"${cell.replaceAll('"', '""')}"`)
      .join(';'),
  );
  const csv = '﻿' + [header.join(';'), ...lines].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileBaseName}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
