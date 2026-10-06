import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import {
  Board,
  BoardCard,
  BoardColumnId,
  CARD_TYPE_LABELS,
  COLUMN_STATUS_META,
  PRIORITY_META,
} from '../../core/models';
import { PeopleService } from '../../core/services/people.service';
import { ToastService } from '../../core/services/toast.service';
import { CalendarDatePipe } from '../../shared/pipes/pipes';
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  FormField,
  FormInput,
  Icon,
  LoadingState,
  PageHeader,
  Person,
  SearchInput,
  StatusBadge,
} from '../../shared/ui';
import { BoardCardView } from './board-card';
import { columnOf, findCard, moveCard } from './board-logic';
import { BoardService } from './board.service';

@Component({
  selector: 'sga-board-page',
  imports: [
    FormsModule,
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    CdkScrollable,
    PageHeader,
    Card,
    Button,
    Icon,
    SearchInput,
    FormField,
    FormInput,
    StatusBadge,
    Person,
    Drawer,
    EmptyState,
    LoadingState,
    BoardCardView,
    CalendarDatePipe,
  ],
  templateUrl: './board-page.html',
  styleUrl: './board-page.scss',
})
export default class BoardPage {
  private readonly service = inject(BoardService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly people = inject(PeopleService);

  /** Quadro selecionado (?board=). */
  readonly board = input<string>();

  protected readonly columnMeta = COLUMN_STATUS_META;
  protected readonly priority = PRIORITY_META;
  protected readonly typeLabels = CARD_TYPE_LABELS;

  protected readonly summaries = rxResource({
    stream: () => this.service.list(),
    defaultValue: [],
  });

  protected readonly selectedId = linkedSignal(
    () => this.board() ?? this.summaries.value()[0]?.board.id ?? '',
  );
  protected readonly selectedSummary = computed(() =>
    this.summaries.value().find((s) => s.board.id === this.selectedId()),
  );

  /** Estado local editável do quadro; reinicia ao trocar de quadro ou recarregar. */
  protected readonly current = linkedSignal<Board | undefined>(() => this.selectedSummary()?.board);

  protected readonly query = signal('');
  protected readonly assignee = signal('');
  protected readonly mineOnly = signal(false);

  protected readonly assignees = computed(() => {
    const ids = new Set(
      this.current()?.columns.flatMap((c) => c.cards.map((card) => card.assigneeId)) ?? [],
    );
    return [...ids]
      .map((id) => ({ id, name: this.people.nameOf(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly visibleColumns = computed(() => {
    const board = this.current();
    if (!board) {
      return [];
    }
    const q = this.query().trim().toLowerCase();
    const assignee = this.mineOnly() ? (this.session.currentUser()?.id ?? '') : this.assignee();
    return board.columns.map((column) => ({
      ...column,
      total: column.cards.length,
      cards: column.cards.filter(
        (card) =>
          (!assignee || card.assigneeId === assignee) &&
          (!q ||
            `${card.code ?? ''} ${card.title} ${card.tags.join(' ')}`.toLowerCase().includes(q)),
      ),
    }));
  });

  protected readonly filtering = computed(
    () => !!this.query().trim() || !!this.assignee() || this.mineOnly(),
  );

  // Detalhe do cartão
  protected readonly detailId = signal<string | null>(null);
  protected readonly detailOpen = computed(() => this.detailId() !== null);
  protected readonly detailCard = computed(() => {
    const board = this.current();
    const id = this.detailId();
    return board && id ? findCard(board, id) : undefined;
  });
  protected readonly detailColumn = computed(() => {
    const board = this.current();
    const id = this.detailId();
    return board && id ? columnOf(board, id) : undefined;
  });

  protected selectBoard(id: string): void {
    this.selectedId.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { board: id },
      replaceUrl: true,
    });
  }

  protected onDrop(event: CdkDragDrop<BoardColumnId, BoardColumnId, BoardCard>): void {
    const board = this.current();
    if (!board) {
      return;
    }
    const card = event.item.data;
    const target = this.visibleColumns().find((c) => c.id === event.container.data);
    // Posição relativa aos cartões visíveis (respeita filtros ativos).
    const siblings = target?.cards.filter((c) => c.id !== card.id) ?? [];
    const before = siblings[event.currentIndex]?.id ?? null;
    this.applyMove(board, card, event.container.data, before);
  }

  protected moveTo(columnId: BoardColumnId): void {
    const board = this.current();
    const card = this.detailCard();
    if (board && card && columnId !== this.detailColumn()) {
      this.applyMove(board, card, columnId, null);
    }
  }

  protected setDetailOpen(open: boolean): void {
    if (!open) {
      this.detailId.set(null);
    }
  }

  protected reset(): void {
    const board = this.current();
    if (!board) {
      return;
    }
    this.service.reset(board.id).subscribe((original) => {
      this.current.set(original);
      this.toast.show('Quadro restaurado para a organização original.', 'info');
    });
  }

  private applyMove(
    board: Board,
    card: BoardCard,
    toColumn: BoardColumnId,
    beforeCardId: string | null,
  ): void {
    const fromColumn = columnOf(board, card.id);
    const updated = moveCard(board, card.id, toColumn, beforeCardId);
    if (updated === board) {
      return;
    }
    this.current.set(updated);
    this.service.save(updated).subscribe();
    if (fromColumn !== toColumn) {
      this.toast.show(
        `${card.code ?? card.title} movido para ${COLUMN_STATUS_META[toColumn].label}.`,
      );
    }
  }
}
