import { Component, computed, input, output } from '@angular/core';
import { QualitySignal } from '../../../core/models';
import { Icon } from '../../../shared/ui';
import { metricDefinition } from '../quality-metrics';
import { SEVERITY_META } from '../quality-ui';

/** Lista executiva dos sinais: onde há algo anormal e por onde começar a investigar. */
@Component({
  selector: 'sga-quality-signal-list',
  imports: [Icon],
  template: `
    @if (items().length) {
      <ul>
        @for (item of items(); track item.signal.id) {
          <li>
            <button type="button" (click)="open.emit(item.signal)">
              <span [class]="'severity severity--' + item.meta.tone">
                <sga-icon [name]="item.meta.icon" [size]="14" />{{ item.meta.label }}
              </span>
              <span class="body">
                <span class="title">
                  <strong>{{ item.signal.title }}</strong>
                  <span class="metric">&nbsp;· {{ item.metric }}</span>
                </span>
                <span class="message">{{ item.signal.message }}</span>
                <span class="where meta">{{ item.where }}</span>
              </span>
              <span class="cta"> Detalhar <sga-icon name="chevron-right" [size]="16" /> </span>
            </button>
          </li>
        }
      </ul>
    } @else {
      <p class="empty">
        <sga-icon name="circle-check" [size]="16" />
        Nenhum sinal nos indicadores para o recorte selecionado.
      </p>
    }
  `,
  styles: `
    ul {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li + li {
      border-top: 1px solid var(--border);
    }
    button {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-5);
      border: 0;
      background: transparent;
      text-align: left;
      transition: background var(--transition-fast);
    }
    button:hover {
      background: var(--surface-muted);
    }
    button:focus-visible {
      outline-offset: -2px;
    }
    .severity {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      padding: 2px var(--space-2);
      border-radius: var(--radius-sm);
      font-size: var(--fs-meta);
      font-weight: 600;
    }
    .severity--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    .severity--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }
    .severity--info {
      background: var(--info-100);
      color: var(--info-700);
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .metric {
      color: var(--text-secondary);
    }
    .message {
      font-size: 13px;
    }
    .cta {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
      font-weight: 500;
      color: var(--green-700);
      white-space: nowrap;
    }
    .empty {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-5);
      color: var(--success-700);
    }
    @media (max-width: 720px) {
      button {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class QualitySignalList {
  readonly signals = input.required<readonly QualitySignal[]>();
  readonly open = output<QualitySignal>();

  protected readonly items = computed(() =>
    this.signals().map((signal) => {
      const definition = metricDefinition(signal.metricId);
      const context = signal.context;
      const segment = [context?.clientName, context?.auditArea].filter(Boolean).join(' · ');
      // Em cartas mensais o sinal é da firma; o segmento é só onde há mais ocorrências.
      const where = [
        signal.pointLabel,
        segment && (definition.method === 'I-MR' ? segment : `maior concentração: ${segment}`),
      ]
        .filter(Boolean)
        .join(' · ');
      return {
        signal,
        meta: SEVERITY_META[signal.severity],
        metric: definition.title,
        where,
      };
    }),
  );
}
