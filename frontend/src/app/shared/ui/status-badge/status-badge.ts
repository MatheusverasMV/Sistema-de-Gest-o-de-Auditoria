import { Component, computed, input } from '@angular/core';
import { StatusTone } from '../../../core/models';
import { Icon } from '../icon/icon';

/**
 * Escala que o selo representa. Muda só a apresentação; o tom vem dos mesmos `*_META`.
 * - `status`: situação de fluxo. Vermelho só para alarmes (pendência, falha, devolução).
 * - `priority`: prioridade operacional (Baixa, Média, Alta). Nunca vermelha (decisão D1).
 * - `risk`: nível de risco, na escala `--risk-*` da identidade AUDIMEC.
 */
export type BadgeKind = 'status' | 'priority' | 'risk';

type Appearance =
  | 'neutral'
  | 'info'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'level-medium'
  | 'level-high'
  | 'risk-low'
  | 'risk-medium'
  | 'risk-high';

const OVERRIDES: Record<Exclude<BadgeKind, 'status'>, Partial<Record<StatusTone, Appearance>>> = {
  priority: { warning: 'level-medium', danger: 'level-high' },
  risk: { success: 'risk-low', warning: 'risk-medium', danger: 'risk-high' },
};

/**
 * Selo compacto (20 px, raio 2). Por padrão sem fundo: um marcador de forma distinta por tom
 * mais o texto, para que a situação não dependa só da cor. Fundo apenas em atenção (lima),
 * alarme (vermelho) e risco.
 */
@Component({
  selector: 'sga-status-badge',
  imports: [Icon],
  template: `
    @if (appearance() === 'success') {
      <sga-icon name="check" [size]="12" [strokeWidth]="3" class="mark mark--check" />
    } @else {
      <span class="mark" aria-hidden="true"></span>
    }
    {{ label() }}
  `,
  host: { '[class]': "'badge badge--' + appearance()" },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 20px;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--fs-meta);
      font-weight: var(--fw-body);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      line-height: 1;
    }
    .mark {
      flex-shrink: 0;
      width: 7px;
      height: 7px;
      border-radius: 1px;
    }

    /* Sem fundo: a forma do marcador diferencia os estados do fluxo. */
    :host(.badge--neutral) .mark {
      box-shadow: inset 0 0 0 1.5px var(--text-secondary);
    }
    :host(.badge--info) .mark {
      background: linear-gradient(90deg, var(--info-700) 50%, transparent 50%);
      box-shadow: inset 0 0 0 1.5px var(--info-700);
    }
    :host(.badge--brand) .mark {
      background: var(--brand);
    }
    :host(.badge--success) .mark--check {
      width: auto;
      height: auto;
      color: var(--success-700);
    }

    /* Com fundo: atenção e alarme. */
    :host(.badge--warning),
    :host(.badge--danger),
    :host([class*='badge--risk-']) {
      padding: 0 6px;
    }
    :host(.badge--warning) {
      background: var(--warning-100);
      color: var(--warning-700);
    }
    :host(.badge--warning) .mark,
    :host(.badge--level-medium) .mark,
    :host(.badge--risk-medium) .mark {
      background: var(--warning-500);
      box-shadow: inset 0 0 0 1px var(--warning-700);
    }
    :host(.badge--danger) {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    :host(.badge--danger) .mark {
      background: var(--danger-700);
    }

    /* Prioridade operacional: intensidade pelo marcador e pelo peso, sem vermelho. */
    :host(.badge--level-high) {
      font-weight: var(--fw-strong);
    }
    :host(.badge--level-high) .mark {
      background: var(--brand);
    }

    /* Risco: escala institucional --risk-* (sempre com o rótulo textual). */
    :host(.badge--risk-low) {
      background: var(--risk-low-bg);
      color: var(--risk-low-fg);
    }
    :host(.badge--risk-low) .mark {
      box-shadow: inset 0 0 0 1.5px currentColor;
    }
    :host(.badge--risk-medium) {
      background: var(--risk-medium-bg);
      color: var(--risk-medium-fg);
    }
    :host(.badge--risk-high) {
      background: var(--risk-high-bg);
      color: var(--risk-high-fg);
    }
    :host(.badge--risk-high) .mark {
      background: currentColor;
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
  readonly kind = input<BadgeKind>('status');

  protected readonly appearance = computed<Appearance>(() => {
    const kind = this.kind();
    const tone = this.tone();
    return (kind === 'status' ? undefined : OVERRIDES[kind][tone]) ?? tone;
  });
}
