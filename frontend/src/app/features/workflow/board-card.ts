import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BoardCard,
  BoardColumnId,
  CARD_TYPE_LABELS,
  COLUMN_STATUS_META,
  PRIORITY_META,
  WORKPAPER_STATUS_META,
  WorkpaperStatus,
} from '../../core/models';
import { PeopleService } from '../../core/services/people.service';
import { CalendarDatePipe, isOverdue } from '../../shared/pipes/pipes';
import { Avatar, Icon, StatusBadge } from '../../shared/ui';

const TYPE_ICON: Record<BoardCard['type'], string> = {
  task: 'list-todo',
  workpaper: 'file-text',
  review: 'clipboard-check',
  procedure: 'target',
  issue: 'flag',
};

@Component({
  selector: 'sga-board-card',
  imports: [RouterLink, Avatar, Icon, StatusBadge, CalendarDatePipe],
  template: `
    <button
      type="button"
      class="surface"
      (click)="selected.emit(card())"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="top">
        <span class="type">
          <sga-icon [name]="typeIcon[card().type]" [size]="12" />{{ typeLabel[card().type] }}
        </span>
        @if (card().code) {
          <span class="code mono">{{ card().code }}</span>
        }
      </span>
      <span class="title">{{ card().title }}</span>
      <!-- Categorias como texto neutro; a coluna já informa o status (aria-label mantém). -->
      @if (card().tags.length) {
        <span class="tags">{{ card().tags.join(' · ') }}</span>
      }
      <span class="bottom">
        <sga-status-badge
          [label]="priority[card().priority].label"
          [tone]="priority[card().priority].tone"
          kind="priority"
        />
        <span class="due" [class.overdue]="overdue()">
          <sga-icon name="calendar-clock" [size]="13" />{{ card().dueDate | calendarDate }}
        </span>
        <sga-avatar class="assignee" [name]="assigneeName()" [size]="24" />
      </span>
      @if (formalStatus(); as formal) {
        <!-- Status formal do PTA: sempre visível; destaque lima só quando diverge da coluna. -->
        <span class="formal" [class.formal--differs]="positionDiffers()">
          <sga-icon [name]="positionDiffers() ? 'circle-alert' : 'file-text'" [size]="12" />
          PTA: {{ workpaperStatus[formal].label }}
          @if (positionDiffers()) {
            <span class="formal-note">· difere da coluna</span>
          }
        </span>
      }
    </button>
    @if (card().workpaperId && workpaperLinked()) {
      <a
        class="open-link"
        [routerLink]="['/workpapers', card().workpaperId]"
        [attr.aria-label]="'Abrir ' + card().workpaperId"
        title="Abrir PTA"
        (mousedown)="$event.stopPropagation()"
      >
        <sga-icon name="arrow-up-right" [size]="14" />
      </a>
    }
  `,
  styleUrl: './board-card.scss',
})
export class BoardCardView {
  private readonly people = inject(PeopleService);

  readonly card = input.required<BoardCard>();
  /** O PTA vinculado existe no catálogo? Sem vínculo válido, o atalho não é exibido. */
  readonly workpaperLinked = input(true);
  /** Status formal do PTA representado (só cartões do tipo PTA). */
  readonly formalStatus = input<WorkpaperStatus>();
  /** A coluna atual difere da coluna do status formal (movimentação operacional). */
  readonly positionDiffers = input(false);

  protected readonly workpaperStatus = WORKPAPER_STATUS_META;
  readonly columnId = input.required<BoardColumnId>();
  readonly selected = output<BoardCard>();

  protected readonly typeLabel = CARD_TYPE_LABELS;
  protected readonly typeIcon = TYPE_ICON;
  protected readonly priority = PRIORITY_META;

  protected readonly statusMeta = computed(() => COLUMN_STATUS_META[this.columnId()]);
  protected readonly assigneeName = computed(() => this.people.nameOf(this.card().assigneeId));
  protected readonly overdue = computed(
    () => this.columnId() !== 'done' && isOverdue(this.card().dueDate),
  );
  protected readonly ariaLabel = computed(() => {
    const c = this.card();
    return `${CARD_TYPE_LABELS[c.type]} ${c.code ?? ''} ${c.title}. Responsável: ${this.assigneeName()}. Prioridade ${PRIORITY_META[c.priority].label}. Coluna: ${this.statusMeta().label}.${this.formalStatus() ? ` Status formal do PTA: ${WORKPAPER_STATUS_META[this.formalStatus()!].label}.` : ''} Abrir detalhes.`;
  });
}
