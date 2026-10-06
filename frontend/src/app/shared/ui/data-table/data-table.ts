import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChildren,
  Directive,
  inject,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { EmptyState, LoadingState } from '../states/states';

export interface TableColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: 'left' | 'right' | 'center';
  readonly width?: string;
}

export interface CellContext<T> {
  readonly $implicit: T;
}

/**
 * Template de célula tipado: `<ng-template sgaCell="status" [sgaCellOf]="rows" let-row>`.
 * `sgaCellOf` existe apenas para inferir o tipo de `row` no template.
 */
@Directive({ selector: 'ng-template[sgaCell]' })
export class CellDef<T> {
  readonly column = input.required<string>({ alias: 'sgaCell' });
  readonly rowsType = input<readonly T[]>([], { alias: 'sgaCellOf' });
  readonly template = inject<TemplateRef<CellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: CellDef<T>, ctx: unknown): ctx is CellContext<T> {
    return true;
  }
}

@Component({
  selector: 'sga-data-table',
  imports: [NgTemplateOutlet, EmptyState, LoadingState],
  template: `
    @if (loading()) {
      <sga-loading-state [rows]="5" />
    } @else if (!rows().length) {
      <sga-empty-state
        [heading]="emptyHeading()"
        [description]="emptyDescription()"
        icon="inbox"
        [compact]="true"
      />
    } @else {
      <div class="scroll">
        <table>
          @if (caption()) {
            <caption class="sr-only">
              {{
                caption()
              }}
            </caption>
          }
          <thead>
            <tr>
              @for (col of columns(); track col.key) {
                <th scope="col" [style.width]="col.width" [style.text-align]="col.align ?? 'left'">
                  {{ col.label }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index) {
              <tr
                [class.interactive]="interactive()"
                [attr.tabindex]="interactive() ? 0 : null"
                (click)="interactive() && rowActivate.emit(row)"
                (keydown.enter)="interactive() && rowActivate.emit(row)"
              >
                @for (col of columns(); track col.key) {
                  <td [style.text-align]="col.align ?? 'left'">
                    @if (templates().get(col.key); as tpl) {
                      <ng-container *ngTemplateOutlet="tpl; context: { $implicit: row }" />
                    } @else {
                      {{ cellValue(row, col.key) }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      font-size: var(--fs-body);
    }
    th {
      padding: 10px var(--space-4);
      border-bottom: 1px solid var(--border);
      background: var(--surface-muted);
      font-size: var(--fs-meta);
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--text-secondary);
      white-space: nowrap;
    }
    td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    tr.interactive {
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }
    tr.interactive:hover {
      background: var(--green-50);
    }
    tr.interactive:focus-visible {
      outline: 2px solid var(--green-500);
      outline-offset: -2px;
    }
  `,
})
export class DataTable<T> {
  readonly columns = input.required<readonly TableColumn[]>();
  readonly rows = input.required<readonly T[]>();
  readonly loading = input(false);
  readonly interactive = input(false);
  readonly caption = input<string>();
  readonly emptyHeading = input('Nenhum registro encontrado');
  readonly emptyDescription = input<string>();

  readonly rowActivate = output<T>();

  private readonly cellDefs = contentChildren<CellDef<T>>(CellDef);
  protected readonly templates = computed(
    () => new Map(this.cellDefs().map((def) => [def.column(), def.template])),
  );

  protected cellValue(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }
}
