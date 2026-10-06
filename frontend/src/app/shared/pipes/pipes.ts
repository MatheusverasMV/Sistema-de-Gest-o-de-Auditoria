import { Pipe, PipeTransform } from '@angular/core';
import { prototypeNow } from '../../core/config/prototype.config';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "agora", "há 25 min", "há 3 h", "ontem", "há 4 dias" — relativo ao relógio do protótipo. */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(iso: string): string {
    const diff = prototypeNow().getTime() - new Date(iso).getTime();
    if (diff < MINUTE) return 'agora';
    if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
    if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
    const days = Math.floor(diff / DAY);
    if (days === 1) return 'ontem';
    if (days < 30) return `há ${days} dias`;
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}

/** Valores monetários compactos para KPIs: R$ 18,2 mi, R$ 450 mil. */
@Pipe({ name: 'compactCurrency' })
export class CompactCurrencyPipe implements PipeTransform {
  transform(value: number): string {
    const abs = Math.abs(value);
    const format = (n: number, digits: number) =>
      n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
    if (abs >= 1_000_000) return `R$ ${format(value / 1_000_000, 1)} mi`;
    if (abs >= 1_000) return `R$ ${format(value / 1_000, 0)} mil`;
    return `R$ ${format(value, 2)}`;
  }
}

/** Data de calendário (YYYY-MM-DD) sem conversão de fuso: 2026-10-08 → 08/10/2026. */
@Pipe({ name: 'calendarDate' })
export class CalendarDatePipe implements PipeTransform {
  transform(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
}

export function isOverdue(dueDate: string): boolean {
  return dueDate.slice(0, 10) < prototypeNow().toISOString().slice(0, 10);
}
