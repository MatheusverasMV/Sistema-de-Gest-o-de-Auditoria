import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Workpaper, WORKPAPER_STATUS_META } from '../../core/models';
import { RelativeTimePipe } from '../../shared/pipes/pipes';
import { CellDef, DataTable, Person, StatusBadge, TableColumn } from '../../shared/ui';

export interface WorkpaperRow {
  readonly workpaper: Workpaper;
  readonly client?: string;
}

/** Tabela de PTAs reutilizada na lista global e na aba PTAs do trabalho. */
@Component({
  selector: 'sga-workpaper-table',
  imports: [DataTable, CellDef, StatusBadge, Person, RelativeTimePipe],
  template: `
    <sga-data-table
      caption="Papéis de trabalho"
      [columns]="columns()"
      [rows]="rows()"
      [loading]="loading()"
      [interactive]="true"
      emptyHeading="Nenhum PTA encontrado"
      [emptyDescription]="emptyDescription()"
      (rowActivate)="open($event.workpaper)"
    >
      <ng-template sgaCell="code" [sgaCellOf]="rows()" let-row>
        <span class="code mono">{{ row.workpaper.id }}</span>
      </ng-template>
      <ng-template sgaCell="area" [sgaCellOf]="rows()" let-row>
        <div class="stack">
          <span class="strong">{{ row.workpaper.area }}</span>
          <span class="meta">{{ row.workpaper.title }}</span>
        </div>
      </ng-template>
      <ng-template sgaCell="client" [sgaCellOf]="rows()" let-row>{{ row.client }}</ng-template>
      <ng-template sgaCell="preparer" [sgaCellOf]="rows()" let-row
        ><sga-person [userId]="row.workpaper.preparerId"
      /></ng-template>
      <ng-template sgaCell="reviewer" [sgaCellOf]="rows()" let-row
        ><sga-person [userId]="row.workpaper.reviewerId"
      /></ng-template>
      <ng-template sgaCell="status" [sgaCellOf]="rows()" let-row>
        <sga-status-badge
          [label]="status[row.workpaper.status].label"
          [tone]="status[row.workpaper.status].tone"
        />
      </ng-template>
      <ng-template sgaCell="updated" [sgaCellOf]="rows()" let-row>
        <span class="meta">{{ row.workpaper.updatedAt | relativeTime }}</span>
      </ng-template>
    </sga-data-table>
  `,
  styles: `
    .code {
      font-weight: 600;
      color: var(--green-700);
      white-space: nowrap;
    }
    .stack {
      display: flex;
      flex-direction: column;
    }
    .strong {
      font-weight: 600;
    }
  `,
})
export class WorkpaperTable {
  private readonly router = inject(Router);

  readonly rows = input.required<readonly WorkpaperRow[]>();
  readonly loading = input(false);
  readonly showClient = input(false);
  readonly emptyDescription = input<string>();

  protected readonly status = WORKPAPER_STATUS_META;

  protected readonly columns = computed<TableColumn[]>(() => [
    { key: 'code', label: 'Código', width: '130px' },
    { key: 'area', label: 'Área / PTA' },
    ...(this.showClient() ? [{ key: 'client', label: 'Cliente', width: '170px' }] : []),
    { key: 'preparer', label: 'Preparado por', width: '170px' },
    { key: 'reviewer', label: 'Revisor', width: '160px' },
    { key: 'status', label: 'Status', width: '170px' },
    { key: 'updated', label: 'Atualizado', width: '110px' },
  ]);

  protected open(workpaper: Workpaper): void {
    this.router.navigate(['/workpapers', workpaper.id]);
  }
}
