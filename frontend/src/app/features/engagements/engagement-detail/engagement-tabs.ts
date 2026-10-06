import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ADJUSTMENT_STATUS_META,
  AuditAdjustment,
  Engagement,
  EngagementRisk,
  Materiality,
  RISK_META,
  Workpaper,
  WORKPAPER_MAIN_FLOW,
  WORKPAPER_STATUS_META,
  WorkpaperStatus,
} from '../../../core/models';
import { CalendarDatePipe, CompactCurrencyPipe } from '../../../shared/pipes/pipes';
import {
  Button,
  Card,
  CellDef,
  DataTable,
  EmptyState,
  Icon,
  KpiCard,
  Person,
  ProgressBar,
  StatusBadge,
  TableColumn,
} from '../../../shared/ui';

/* Abas do detalhe do trabalho. Cada aba é um componente de apresentação puro, alimentado pela página. */

const STATUS_ORDER: readonly WorkpaperStatus[] = [
  ...WORKPAPER_MAIN_FLOW.slice(0, 4),
  'with_issues',
  'finalized',
];

@Component({
  selector: 'sga-engagement-overview',
  imports: [
    Card,
    KpiCard,
    ProgressBar,
    StatusBadge,
    Button,
    Icon,
    CalendarDatePipe,
    CompactCurrencyPipe,
  ],
  template: `
    <div class="grid-kpi">
      <sga-kpi-card
        label="Progresso geral"
        icon="target"
        [value]="engagement().progress + '%'"
        hint="Horas executadas sobre o orçado"
      />
      <sga-kpi-card
        label="PTAs finalizados"
        icon="clipboard-check"
        [value]="finalized() + ' de ' + workpapers().length"
        hint="Concluídos e revisados"
      />
      <sga-kpi-card
        label="Riscos significativos"
        icon="triangle-alert"
        tone="danger"
        [value]="highRisks()"
        hint="Classificados como risco alto"
      />
      <sga-kpi-card
        label="Ajustes propostos"
        icon="scale"
        tone="warning"
        [value]="proposedTotal() | compactCurrency"
        [hint]="proposedCount() + ' aguardando decisão do cliente'"
      />
    </div>

    <div class="cols">
      <sga-card heading="Escopo e próximos marcos">
        <p class="scope">{{ engagement().scope }}</p>
        <sga-progress-bar
          class="progress"
          [value]="engagement().progress"
          label="Progresso do trabalho"
        />
        <ul class="milestones">
          @for (m of nextMilestones(); track m.label) {
            <li>
              <sga-icon name="calendar-clock" [size]="16" />
              <span class="grow">{{ m.label }}</span>
              <span class="meta mono">{{ m.date | calendarDate }}</span>
            </li>
          } @empty {
            <li class="meta">Todos os marcos foram concluídos.</li>
          }
        </ul>
      </sga-card>

      <sga-card
        heading="Situação dos PTAs"
        [subheading]="workpapers().length + ' papéis de trabalho'"
      >
        <button
          card-actions
          sgaButton
          variant="ghost"
          size="sm"
          trailingIcon="arrow-right"
          type="button"
          (click)="openTab.emit('workpapers')"
        >
          Ver PTAs
        </button>
        <ul class="status-list">
          @for (row of statusCounts(); track row.status) {
            <li>
              <sga-status-badge [label]="meta[row.status].label" [tone]="meta[row.status].tone" />
              <span class="count mono">{{ row.count }}</span>
            </li>
          }
        </ul>
      </sga-card>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .cols {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: var(--space-4);
    }
    @media (max-width: 1000px) {
      .cols {
        grid-template-columns: 1fr;
      }
    }
    .scope {
      color: var(--text-secondary);
    }
    .progress {
      margin: var(--space-4) 0;
    }
    .milestones li,
    .status-list li {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) 0;
      border-top: 1px solid var(--border);
    }
    .milestones sga-icon {
      color: var(--green-500);
    }
    .grow {
      flex: 1;
    }
    .status-list li {
      justify-content: space-between;
    }
    .status-list li:first-child {
      border-top: 0;
    }
    .count {
      font-weight: 600;
    }
  `,
})
export class OverviewTab {
  readonly engagement = input.required<Engagement>();
  readonly workpapers = input.required<readonly Workpaper[]>();
  readonly openTab = output<string>();

  protected readonly meta = WORKPAPER_STATUS_META;
  protected readonly finalized = computed(
    () => this.workpapers().filter((w) => w.status === 'finalized').length,
  );
  protected readonly highRisks = computed(
    () => this.engagement().risks.filter((r) => r.level === 'high').length,
  );
  private readonly proposed = computed(() =>
    this.engagement().adjustments.filter((a) => a.status === 'proposed'),
  );
  protected readonly proposedCount = computed(() => this.proposed().length);
  protected readonly proposedTotal = computed(() =>
    this.proposed().reduce((sum, a) => sum + Math.abs(a.amount), 0),
  );
  protected readonly nextMilestones = computed(() =>
    this.engagement()
      .milestones.filter((m) => !m.done)
      .slice(0, 3),
  );
  protected readonly statusCounts = computed(() =>
    STATUS_ORDER.map((status) => ({
      status,
      count: this.workpapers().filter((w) => w.status === status).length,
    })),
  );
}

@Component({
  selector: 'sga-engagement-planning',
  imports: [Card, Icon, CalendarDatePipe],
  template: `
    <sga-card
      heading="Cronograma do trabalho"
      subheading="Marcos de planejamento, execução e emissão"
    >
      <ol class="timeline">
        @for (m of engagement().milestones; track m.label) {
          <li [class.done]="m.done">
            <span class="marker"><sga-icon [name]="m.done ? 'check' : 'clock'" [size]="14" /></span>
            <span class="label">{{ m.label }}</span>
            <span class="meta mono">{{ m.date | calendarDate }}</span>
            <span class="meta state">{{ m.done ? 'Concluído' : 'Pendente' }}</span>
          </li>
        }
      </ol>
    </sga-card>
  `,
  styles: `
    .timeline li {
      display: grid;
      grid-template-columns: 28px 1fr 100px 80px;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-top: 1px solid var(--border);
    }
    .timeline li:first-child {
      border-top: 0;
    }
    .marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--surface-sunken);
      color: var(--text-secondary);
    }
    .done .marker {
      background: var(--green-100);
      color: var(--green-700);
    }
    .done .label {
      color: var(--text-secondary);
    }
    .state {
      text-align: right;
    }
  `,
})
export class PlanningTab {
  readonly engagement = input.required<Engagement>();
}

@Component({
  selector: 'sga-engagement-risks',
  imports: [Card, DataTable, CellDef, StatusBadge],
  template: `
    <sga-card
      heading="Matriz de riscos"
      subheading="Riscos de distorção relevante e respostas planejadas"
      [flush]="true"
    >
      <sga-data-table
        caption="Riscos identificados"
        [columns]="columns"
        [rows]="risks()"
        emptyHeading="Nenhum risco registrado"
        emptyDescription="Os riscos são registrados durante o planejamento do trabalho."
      >
        <ng-template sgaCell="id" [sgaCellOf]="risks()" let-row
          ><span class="mono strong">{{ row.id }}</span></ng-template
        >
        <ng-template sgaCell="level" [sgaCellOf]="risks()" let-row
          ><sga-status-badge [label]="riskMeta[row.level].label" [tone]="riskMeta[row.level].tone"
        /></ng-template>
        <ng-template sgaCell="response" [sgaCellOf]="risks()" let-row
          ><span class="text-secondary">{{ row.response }}</span></ng-template
        >
      </sga-data-table>
    </sga-card>
  `,
  styles: `
    .strong {
      font-weight: 600;
    }
  `,
})
export class RisksTab {
  readonly risks = input.required<readonly EngagementRisk[]>();
  protected readonly riskMeta = RISK_META;
  protected readonly columns: TableColumn[] = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'area', label: 'Área', width: '150px' },
    { key: 'description', label: 'Risco' },
    { key: 'level', label: 'Nível', width: '110px' },
    { key: 'response', label: 'Resposta planejada' },
  ];
}

@Component({
  selector: 'sga-engagement-materiality',
  imports: [Card, EmptyState, CurrencyPipe, DecimalPipe],
  template: `
    @if (materiality(); as m) {
      <div class="figures">
        <sga-card>
          <span class="meta">Materialidade global</span>
          <span class="figure">{{ m.overall | currency: 'BRL' : 'symbol' : '1.0-0' }}</span>
          <span class="meta"
            >{{ m.percentage | number: '1.1-1' }}% de {{ m.benchmark.toLowerCase() }} ({{
              m.benchmarkValue | currency: 'BRL' : 'symbol' : '1.0-0'
            }})</span
          >
        </sga-card>
        <sga-card>
          <span class="meta">Materialidade para execução</span>
          <span class="figure">{{ m.performance | currency: 'BRL' : 'symbol' : '1.0-0' }}</span>
          <span class="meta">75% da materialidade global</span>
        </sga-card>
        <sga-card>
          <span class="meta">Limite de trivialidade</span>
          <span class="figure">{{
            m.trivialThreshold | currency: 'BRL' : 'symbol' : '1.0-0'
          }}</span>
          <span class="meta">5% da materialidade global</span>
        </sga-card>
      </div>
    } @else {
      <sga-card>
        <sga-empty-state
          heading="Materialidade ainda não aprovada"
          description="A materialidade é definida e aprovada pelo sócio ao final do planejamento."
          icon="scale"
        />
      </sga-card>
    }
  `,
  styles: `
    .figures {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }
    @media (max-width: 900px) {
      .figures {
        grid-template-columns: 1fr;
      }
    }
    .figure {
      display: block;
      margin: var(--space-1) 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
  `,
})
export class MaterialityTab {
  readonly materiality = input.required<Materiality | null>();
}

@Component({
  selector: 'sga-engagement-evidences',
  imports: [Card, DataTable, CellDef, Icon, Person, RouterLink, CalendarDatePipe],
  template: `
    <sga-card
      heading="Evidências"
      subheading="Todas as evidências anexadas aos PTAs deste trabalho"
      [flush]="true"
    >
      <sga-data-table
        caption="Evidências"
        [columns]="columns"
        [rows]="rows()"
        emptyHeading="Nenhuma evidência anexada"
      >
        <ng-template sgaCell="name" [sgaCellOf]="rows()" let-row>
          <span class="evidence">
            <sga-icon
              [name]="row.evidence.kind === 'automation' ? 'zap' : 'paperclip'"
              [size]="16"
            />
            {{ row.evidence.name }}
          </span>
        </ng-template>
        <ng-template sgaCell="kind" [sgaCellOf]="rows()" let-row>{{
          row.evidence.kind === 'automation' ? 'Automação' : 'Arquivo'
        }}</ng-template>
        <ng-template sgaCell="workpaper" [sgaCellOf]="rows()" let-row>
          <a [routerLink]="['/workpapers', row.workpaper.id]">{{ row.workpaper.id }}</a>
        </ng-template>
        <ng-template sgaCell="addedBy" [sgaCellOf]="rows()" let-row
          ><sga-person [userId]="row.evidence.addedById"
        /></ng-template>
        <ng-template sgaCell="addedAt" [sgaCellOf]="rows()" let-row
          ><span class="mono">{{ row.evidence.addedAt | calendarDate }}</span></ng-template
        >
      </sga-data-table>
    </sga-card>
  `,
  styles: `
    .evidence {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
    .evidence sga-icon {
      color: var(--green-700);
    }
  `,
})
export class EvidencesTab {
  readonly workpapers = input.required<readonly Workpaper[]>();
  protected readonly columns: TableColumn[] = [
    { key: 'name', label: 'Evidência' },
    { key: 'kind', label: 'Origem', width: '110px' },
    { key: 'workpaper', label: 'PTA', width: '130px' },
    { key: 'addedBy', label: 'Adicionada por', width: '180px' },
    { key: 'addedAt', label: 'Data', width: '110px' },
  ];
  protected readonly rows = computed(() =>
    this.workpapers()
      .flatMap((workpaper) => workpaper.evidences.map((evidence) => ({ workpaper, evidence })))
      .sort((a, b) => b.evidence.addedAt.localeCompare(a.evidence.addedAt)),
  );
}

@Component({
  selector: 'sga-engagement-adjustments',
  imports: [Card, DataTable, CellDef, StatusBadge, CurrencyPipe],
  template: `
    <sga-card
      heading="Ajustes de auditoria"
      subheading="Distorções identificadas e decisão da administração"
      [flush]="true"
    >
      <sga-data-table
        caption="Ajustes de auditoria"
        [columns]="columns"
        [rows]="adjustments()"
        emptyHeading="Nenhum ajuste registrado"
        emptyDescription="Ajustes são propostos a partir das exceções identificadas nos PTAs."
      >
        <ng-template sgaCell="id" [sgaCellOf]="adjustments()" let-row
          ><span class="mono strong">{{ row.id }}</span></ng-template
        >
        <ng-template sgaCell="amount" [sgaCellOf]="adjustments()" let-row
          ><span class="mono">{{ row.amount | currency: 'BRL' }}</span></ng-template
        >
        <ng-template sgaCell="status" [sgaCellOf]="adjustments()" let-row
          ><sga-status-badge [label]="meta[row.status].label" [tone]="meta[row.status].tone"
        /></ng-template>
      </sga-data-table>
    </sga-card>
  `,
  styles: `
    .strong {
      font-weight: 600;
    }
  `,
})
export class AdjustmentsTab {
  readonly adjustments = input.required<readonly AuditAdjustment[]>();
  protected readonly meta = ADJUSTMENT_STATUS_META;
  protected readonly columns: TableColumn[] = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'description', label: 'Descrição' },
    { key: 'account', label: 'Conta', width: '220px' },
    { key: 'amount', label: 'Valor', align: 'right', width: '150px' },
    { key: 'status', label: 'Status', width: '170px' },
  ];
}

@Component({
  selector: 'sga-engagement-conclusion',
  imports: [Card, EmptyState, Icon],
  template: `
    @if (engagement().conclusion; as text) {
      <sga-card heading="Conclusão do trabalho">
        <p>{{ text }}</p>
      </sga-card>
    } @else {
      <sga-card heading="Conclusão do trabalho">
        <sga-empty-state
          heading="Conclusão pendente"
          description="A conclusão é registrada pelo sócio após a finalização de todos os PTAs e a decisão sobre os ajustes."
          icon="clipboard-check"
          [compact]="true"
        />
        <ul class="checklist">
          @for (item of checklist(); track item.label) {
            <li [class.ok]="item.ok">
              <sga-icon [name]="item.ok ? 'circle-check' : 'circle-alert'" [size]="18" />
              <span>{{ item.label }}</span>
              <span class="meta">{{ item.detail }}</span>
            </li>
          }
        </ul>
      </sga-card>
    }
  `,
  styles: `
    .checklist {
      max-width: 620px;
      margin: 0 auto;
    }
    .checklist li {
      display: grid;
      grid-template-columns: 24px 1fr auto;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) 0;
      border-top: 1px solid var(--border);
      color: var(--warning-700);
    }
    .checklist li.ok {
      color: var(--green-700);
    }
    .checklist span:not(.meta) {
      color: var(--text-primary);
    }
  `,
})
export class ConclusionTab {
  readonly engagement = input.required<Engagement>();
  readonly workpapers = input.required<readonly Workpaper[]>();

  protected readonly checklist = computed(() => {
    const total = this.workpapers().length;
    const finalized = this.workpapers().filter((w) => w.status === 'finalized').length;
    const openNotes = this.workpapers()
      .flatMap((w) => w.reviewNotes)
      .filter((n) => !n.resolved).length;
    const pendingAdjustments = this.engagement().adjustments.filter(
      (a) => a.status === 'proposed',
    ).length;
    return [
      {
        label: 'Todos os PTAs finalizados',
        detail: `${finalized} de ${total}`,
        ok: total > 0 && finalized === total,
      },
      {
        label: 'Pontos de revisão resolvidos',
        detail: `${openNotes} em aberto`,
        ok: openNotes === 0,
      },
      {
        label: 'Ajustes com decisão da administração',
        detail: `${pendingAdjustments} pendentes`,
        ok: pendingAdjustments === 0,
      },
    ];
  });
}
