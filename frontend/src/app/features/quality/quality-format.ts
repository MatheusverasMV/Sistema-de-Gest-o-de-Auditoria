/** Formatação pt-BR dos indicadores de qualidade. Formas curtas servem ao gráfico; longas, a textos e tooltips. */

export function formatDecimal(value: number, digits = 1): string {
  // Evita "-0,0" quando o arredondamento zera um valor negativo pequeno.
  const rounded = Number(value.toFixed(digits)) || 0;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 4,8 d */
export const formatDaysShort = (value: number) => `${formatDecimal(value)} d`;
/** 4,8 dias */
export const formatDays = (value: number) => `${formatDecimal(value)} dias`;

/** 7,2 h */
export const formatHoursShort = (value: number) => `${formatDecimal(value)} h`;
/** 7,2 h úteis */
export const formatBusinessHours = (value: number) => `${formatDecimal(value)} h úteis`;

/** 0,125 → 12,5% */
export const formatPercent = (ratio: number) => `${formatDecimal(ratio * 100)}%`;

/** 0,25 → +25,0% · −0,12 → -12,0% · 0 → 0,0% */
export const formatSignedPercent = (ratio: number) => {
  const text = formatPercent(ratio);
  return Number((ratio * 100).toFixed(1)) > 0 ? `+${text}` : text;
};

/** Converte taxa por unidade (u) para a escala executiva "por 100 PTAs". */
export const per100 = (u: number) => u * 100;

/** 0,084 → 8,4 */
export const formatPer100Short = (u: number) => formatDecimal(per100(u));
/** 0,084 → 8,4 por 100 PTAs */
export const formatPer100 = (u: number) => `${formatPer100Short(u)} por 100 PTAs`;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** 2026-04 → abr/26 */
export function periodLabel(period: string): string {
  const [year, month] = period.split('-');
  return `${MONTHS[Number(month) - 1]}/${year.slice(2)}`;
}

/** 2026-07-17 → 17/07/2026 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
