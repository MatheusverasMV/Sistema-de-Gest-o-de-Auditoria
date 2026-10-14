import { Component, computed, inject, input, output } from '@angular/core';
import {
  LegacyReviewNote,
  REVIEW_NOTE_SEVERITY_META,
  REVIEW_NOTE_STATUS_META,
  ReviewCycle,
  ReviewNote,
} from '../../../core/models';
import { PeopleService } from '../../../core/services/people.service';
import { DateTimePipe, RelativeTimePipe } from '../../../shared/pipes/pipes';
import { Button, StatusBadge } from '../../../shared/ui';

/** Pontos de revisão do PTA: estruturados (do fluxo formal) e herdados do protótipo. */
@Component({
  selector: 'sga-review-notes-panel',
  imports: [StatusBadge, Button, DateTimePipe, RelativeTimePipe],
  template: `
    <ul class="notes">
      @for (note of notesDesc(); track note.id) {
        <li [class.resolved]="note.status === 'resolved'">
          <div class="note-head">
            <span class="mono strong">{{ note.id }}</span>
            <sga-status-badge
              [label]="severity[note.severity].label"
              [tone]="severity[note.severity].tone"
            />
            <sga-status-badge
              [label]="noteStatus[note.status].label"
              [tone]="noteStatus[note.status].tone"
            />
          </div>
          <p>{{ note.description }}</p>
          <span class="meta">
            {{ people.nameOf(note.createdBy) }} · {{ note.createdAt | dateTime }} ·
            {{ cycleLabel(note.reviewCycleId) }} · responsável {{ people.nameOf(note.assignedTo) }}
          </span>
          @if (note.status === 'resolved') {
            <span class="meta resolution">
              Resolvido por {{ people.nameOf(note.resolvedBy ?? '') }} em
              {{ note.resolvedAt | dateTime }}
              @if (note.resolution) {
                — {{ note.resolution }}
              }
            </span>
          } @else if (resolvable().has(note.id)) {
            <button
              sgaButton
              size="sm"
              variant="secondary"
              icon="circle-check"
              type="button"
              (click)="resolve.emit(note)"
            >
              Marcar como resolvido
            </button>
          }
        </li>
      } @empty {
        <li class="meta">Nenhum ponto de revisão registrado no fluxo formal.</li>
      }
    </ul>

    @if (legacy().length) {
      <h3 class="sub">Pontos herdados do protótipo</h3>
      <p class="meta">Anteriores ao fluxo formal: sem ciclo e fora das regras de aprovação.</p>
      <ul class="notes">
        @for (note of legacy(); track note.id) {
          <li [class.resolved]="note.resolved">
            <div class="note-head">
              <span class="mono strong">{{ note.id }}</span>
              <sga-status-badge
                [label]="note.resolved ? 'Resolvido' : 'Em aberto'"
                [tone]="note.resolved ? 'success' : 'warning'"
              />
            </div>
            <p>{{ note.text }}</p>
            <span class="meta"
              >{{ people.nameOf(note.authorId) }} · {{ note.date | relativeTime }}</span
            >
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .notes {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .notes li {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
      padding: var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-size: 13px;
    }
    .notes li.resolved {
      background: var(--surface-muted);
    }
    .note-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .resolution {
      color: var(--success-700);
    }
    .sub {
      margin-top: var(--space-4);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .sub + .meta {
      margin-bottom: var(--space-2);
    }
  `,
})
export class ReviewNotesPanel {
  readonly notes = input.required<readonly ReviewNote[]>();
  readonly cycles = input.required<readonly ReviewCycle[]>();
  readonly legacy = input.required<readonly LegacyReviewNote[]>();
  /** Pontos que a persona atual pode resolver agora. */
  readonly resolvable = input.required<ReadonlySet<string>>();
  readonly resolve = output<ReviewNote>();

  protected readonly people = inject(PeopleService);
  protected readonly severity = REVIEW_NOTE_SEVERITY_META;
  protected readonly noteStatus = REVIEW_NOTE_STATUS_META;

  /** Abertos primeiro; depois os mais recentes. */
  protected readonly notesDesc = computed(() =>
    [...this.notes()].sort(
      (a, b) =>
        Number(a.status === 'resolved') - Number(b.status === 'resolved') ||
        b.createdAt.localeCompare(a.createdAt),
    ),
  );

  protected cycleLabel(cycleId: string): string {
    const cycle = this.cycles().find((c) => c.id === cycleId);
    return cycle ? `Ciclo ${cycle.sequence}` : cycleId;
  }
}
