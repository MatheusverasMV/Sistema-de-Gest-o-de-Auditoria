import { Component, computed, inject, input } from '@angular/core';
import { WorkpaperWorkflowState } from '../../../core/data/workpaper-workflow';
import {
  REVIEW_CYCLE_RESULT_META,
  REVIEW_NOTE_SEVERITY_META,
  REVIEW_NOTE_STATUS_META,
  WORKPAPER_STATUS_META,
  WorkpaperEvent,
} from '../../../core/models';
import { PeopleService } from '../../../core/services/people.service';
import { DateTimePipe } from '../../../shared/pipes/pipes';
import { Icon, StatusBadge } from '../../../shared/ui';

interface TimelineItem {
  readonly event: WorkpaperEvent;
  readonly icon: string;
  readonly title: string;
  readonly detail?: string;
  readonly cycleLabel?: string;
}

/**
 * Histórico formal do PTA: linha do tempo dos eventos realmente registrados (mais recente
 * primeiro) e ciclos de revisão. Nada aqui é ilustrativo: sem eventos, a tela diz isso.
 */
@Component({
  selector: 'sga-workflow-history',
  imports: [Icon, StatusBadge, DateTimePipe],
  template: `
    @let s = state();
    @if (!s.hasHistory) {
      <p class="legacy" role="note">
        <sga-icon name="info" [size]="16" />
        <span>
          Status <strong>{{ statusMeta[s.baselineStatus].label }}</strong> herdado dos dados do
          protótipo. O histórico anterior não está disponível; os eventos passam a ser registrados a
          partir da próxima ação formal.
        </span>
      </p>
    } @else {
      @if (s.baselineStatus !== 'not_started') {
        <p class="legacy meta" role="note">
          <sga-icon name="info" [size]="14" />
          Antes do primeiro evento registrado, o PTA estava em
          <strong>{{ statusMeta[s.baselineStatus].label }}</strong> (status herdado, sem histórico).
        </p>
      }

      @if (s.cycles.length) {
        <h3 class="sub">Ciclos de revisão</h3>
        <div class="cycles">
          @for (c of cyclesDesc(); track c.id) {
            <details class="cycle" [open]="c.result === 'in_progress' || $first">
              <summary>
                <strong>Ciclo {{ c.sequence }}</strong>
                <sga-status-badge
                  [label]="cycleMeta[c.result].label"
                  [tone]="cycleMeta[c.result].tone"
                />
                @if (c.origin === 'legacy') {
                  <span class="meta">envio anterior ao histórico</span>
                }
              </summary>
              <dl class="cycle-facts">
                <div>
                  <dt>{{ c.sequence > 1 ? 'Reenvio' : 'Envio' }}</dt>
                  <dd>
                    @if (c.submittedAt) {
                      {{ c.submittedAt | dateTime }} · {{ people.nameOf(c.submittedBy ?? '') }}
                    } @else {
                      Não registrado (status herdado)
                    }
                  </dd>
                </div>
                <div>
                  <dt>Início da revisão</dt>
                  <dd>
                    @if (c.reviewStartedAt) {
                      {{ c.reviewStartedAt | dateTime }} · {{ people.nameOf(c.reviewerId ?? '') }}
                    } @else {
                      —
                    }
                  </dd>
                </div>
                <div>
                  <dt>Conclusão</dt>
                  <dd>
                    @if (c.completedAt) {
                      {{ c.completedAt | dateTime }} · {{ people.nameOf(c.completedBy ?? '') }}
                    } @else {
                      Em andamento
                    }
                  </dd>
                </div>
                @if (c.returnReason) {
                  <div>
                    <dt>Motivo da devolução</dt>
                    <dd>{{ c.returnReason }}</dd>
                  </div>
                }
              </dl>
              @let cycleNotes = notesOf(c.id);
              @if (cycleNotes.length) {
                <ul class="cycle-notes">
                  @for (n of cycleNotes; track n.id) {
                    <li>
                      <span class="mono">{{ n.id }}</span>
                      <sga-status-badge
                        [label]="severityMeta[n.severity].label"
                        [tone]="severityMeta[n.severity].tone"
                      />
                      <span class="note-text">{{ n.description }}</span>
                      <sga-status-badge
                        [label]="noteStatusMeta[n.status].label"
                        [tone]="noteStatusMeta[n.status].tone"
                      />
                    </li>
                  }
                </ul>
              }
            </details>
          }
        </div>
      }

      <h3 class="sub">Linha do tempo</h3>
      <ol class="timeline">
        @for (item of timeline(); track item.event.id) {
          <li>
            <span class="dot" aria-hidden="true"><sga-icon [name]="item.icon" [size]="14" /></span>
            <div class="item">
              <span class="when mono">{{ item.event.occurredAt | dateTime }}</span>
              <span class="what">{{ item.title }}</span>
              @if (item.detail) {
                <span class="detail">{{ item.detail }}</span>
              }
              <span class="meta">
                {{ people.nameOf(item.event.actorId ?? '') }}
                @if (item.cycleLabel) {
                  · {{ item.cycleLabel }}
                }
                · <span class="mono">{{ item.event.id }}</span>
              </span>
            </div>
          </li>
        }
      </ol>
      @if (s.anomalies.length) {
        <p class="anomaly" role="alert">
          <sga-icon name="triangle-alert" [size]="14" />
          {{ s.anomalies.length }} evento(s) do histórico não puderam ser aplicados ao estado:
          {{ anomalyText() }}
        </p>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .legacy {
      display: flex;
      gap: var(--space-2);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--surface-muted);
      color: var(--text-secondary);
      font-size: 13px;
    }
    .legacy sga-icon {
      margin-top: 2px;
    }
    .sub {
      margin-top: var(--space-2);
      font-size: var(--fs-meta);
      font-weight: var(--fw-light);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .cycles {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .cycle {
      padding: var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .cycle summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
    }
    .cycle-facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-2) var(--space-4);
      margin: var(--space-3) 0 0;
      font-size: 13px;
    }
    .cycle-facts dt {
      font-size: var(--fs-meta);
      color: var(--text-secondary);
    }
    .cycle-facts dd {
      margin: 0;
    }
    .cycle-notes {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin: var(--space-3) 0 0;
      padding: var(--space-3) 0 0;
      border-top: 1px solid var(--border);
      list-style: none;
      font-size: 13px;
    }
    .cycle-notes li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .note-text {
      flex: 1;
      min-width: 160px;
    }
    .timeline {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .timeline li {
      position: relative;
      display: flex;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
    }
    /* Linha do tempo: trilho de 1 px e marcadores vazados de 24 px, sem fundo por evento. */
    .timeline li:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 28px;
      bottom: 4px;
      left: 12px;
      width: 1px;
      background: var(--border);
    }
    .dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--surface);
      box-shadow: inset 0 0 0 1px var(--border-strong);
      color: var(--text-primary);
    }
    .item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .when {
      font-size: var(--fs-meta);
      color: var(--text-secondary);
    }
    .what {
      font-weight: var(--fw-strong);
    }
    .detail {
      font-size: var(--fs-small);
    }
    .anomaly {
      display: flex;
      gap: var(--space-2);
      font-size: 13px;
      color: var(--danger-700);
    }
  `,
})
export class WorkflowHistory {
  readonly state = input.required<WorkpaperWorkflowState>();
  protected readonly people = inject(PeopleService);

  protected readonly statusMeta = WORKPAPER_STATUS_META;
  protected readonly cycleMeta = REVIEW_CYCLE_RESULT_META;
  protected readonly severityMeta = REVIEW_NOTE_SEVERITY_META;
  protected readonly noteStatusMeta = REVIEW_NOTE_STATUS_META;

  protected readonly cyclesDesc = computed(() => [...this.state().cycles].reverse());

  protected notesOf(cycleId: string) {
    return this.state().notes.filter((n) => n.reviewCycleId === cycleId);
  }

  protected readonly timeline = computed<TimelineItem[]>(() => {
    const { events, cycles } = this.state();
    const cycleLabel = (id?: string) => {
      const cycle = cycles.find((c) => c.id === id);
      return cycle ? `Ciclo ${cycle.sequence}` : undefined;
    };
    return [...events].reverse().map((event) => ({
      event,
      cycleLabel: cycleLabel(event.reviewCycleId),
      ...describeEvent(event),
    }));
  });

  protected readonly anomalyText = computed(() =>
    this.state()
      .anomalies.map((a) => `${a.eventId} (${a.reason})`)
      .join('; '),
  );
}

/** Texto e ícone de cada evento formal na linha do tempo. */
export function describeEvent(event: WorkpaperEvent): {
  icon: string;
  title: string;
  detail?: string;
} {
  switch (event.eventType) {
    case 'WORKPAPER_CREATED':
      return { icon: 'file-text', title: 'PTA criado' };
    case 'PREPARATION_STARTED':
      return event.payload.fromStatus === 'with_issues'
        ? { icon: 'rotate-ccw', title: 'Preparação retomada para correção' }
        : { icon: 'play', title: 'Preparação iniciada' };
    case 'SUBMITTED_FOR_REVIEW':
      return { icon: 'send', title: 'PTA enviado para revisão' };
    case 'RESUBMITTED':
      return { icon: 'send', title: 'PTA reenviado para revisão' };
    case 'REVIEW_STARTED':
      return { icon: 'eye', title: 'Revisão iniciada' };
    case 'REVIEW_NOTE_CREATED':
      return {
        icon: 'message-square',
        title: `Ponto de revisão ${event.payload.reviewNoteId} registrado (${REVIEW_NOTE_SEVERITY_META[event.payload.severity].label})`,
        detail: event.payload.description,
      };
    case 'REVIEW_NOTE_RESOLVED':
      return {
        icon: 'circle-check',
        title: `Ponto de revisão ${event.payload.reviewNoteId} resolvido`,
        detail: event.payload.resolution,
      };
    case 'RETURNED_FOR_CORRECTION':
      return {
        icon: 'rotate-ccw',
        title: 'PTA devolvido para correção',
        detail: event.payload.reason,
      };
    case 'REVIEW_APPROVED':
      return { icon: 'shield-check', title: 'Revisão aprovada' };
    case 'WORKPAPER_FINALIZED':
      return { icon: 'check', title: 'PTA finalizado' };
    case 'WORKPAPER_REOPENED':
      return { icon: 'rotate-ccw', title: 'PTA reaberto', detail: event.payload.reason };
  }
}
