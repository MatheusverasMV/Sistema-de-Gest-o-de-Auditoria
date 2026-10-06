import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, interval, last, take, tap } from 'rxjs';
import { SessionService } from '../../../core/auth/session.service';
import {
  SampleSelectionResult,
  SELECTION_METHOD_LABELS,
  SelectionMethod,
  WORKPAPER_STATUS_META,
} from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { CalendarDatePipe } from '../../../shared/pipes/pipes';
import {
  Button,
  Card,
  CellDef,
  DataTable,
  Drawer,
  EmptyState,
  FileUploader,
  FormField,
  FormInput,
  Icon,
  LoadingState,
  ProgressBar,
  SelectedFile,
  StatusBadge,
  TableColumn,
} from '../../../shared/ui';
import { AutomationService, LinkOutcome } from '../automation.service';
import { downloadSampleCsv } from './sample-export';

type Step = 'data' | 'config' | 'run' | 'result';

const STEPS: readonly { id: Step; label: string }[] = [
  { id: 'data', label: 'Dados' },
  { id: 'config', label: 'Configuração' },
  { id: 'run', label: 'Execução' },
  { id: 'result', label: 'Resultado' },
];

const RUN_STAGES = [
  'Lendo arquivo e identificando colunas',
  'Validando 12.489 lançamentos',
  'Estratificando a população por faixa de valor',
  'Selecionando itens acima da materialidade',
  'Seleção estatística do saldo remanescente',
  'Gerando planilha da amostra',
];

const STAGE_DURATION_MS = 600;

@Component({
  selector: 'sga-sample-selection-wizard',
  imports: [
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    PercentPipe,
    CalendarDatePipe,
    Card,
    Button,
    Icon,
    FileUploader,
    FormField,
    FormInput,
    ProgressBar,
    StatusBadge,
    Drawer,
    DataTable,
    CellDef,
    EmptyState,
    LoadingState,
  ],
  templateUrl: './sample-selection-wizard.html',
  styleUrl: './sample-selection-wizard.scss',
})
export class SampleSelectionWizard {
  private readonly service = inject(AutomationService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** PTA de origem quando a execução parte de um papel de trabalho. */
  readonly workpaperId = input<string>();

  protected readonly steps = STEPS;
  protected readonly stages = RUN_STAGES;
  protected readonly wpStatus = WORKPAPER_STATUS_META;
  protected readonly methodLabels = SELECTION_METHOD_LABELS;
  protected readonly methods = (Object.keys(SELECTION_METHOD_LABELS) as SelectionMethod[]).map(
    (value) => ({
      value,
      label: SELECTION_METHOD_LABELS[value],
    }),
  );

  protected readonly context = rxResource({ stream: () => this.service.runContext() });

  protected readonly contextWorkpaper = computed(() =>
    this.context.value()?.workpapers.find((w) => w.id === this.workpaperId()),
  );

  // Dados e configuração
  protected readonly step = signal<Step>('data');
  protected readonly file = signal<SelectedFile | null>(null);
  protected readonly engagementId = linkedSignal(
    () => this.contextWorkpaper()?.engagementId ?? this.context.value()?.engagements[0]?.id ?? '',
  );
  protected readonly engagement = computed(() =>
    this.context.value()?.engagements.find((e) => e.id === this.engagementId()),
  );
  protected readonly materiality = linkedSignal(
    () => this.engagement()?.materiality?.performance ?? 0,
  );
  protected readonly method = signal<SelectionMethod>('monetary');
  protected readonly minimumItems = signal(25);
  protected readonly configValid = computed(
    () =>
      !!this.engagementId() &&
      this.materiality() > 0 &&
      Number.isInteger(this.minimumItems()) &&
      this.minimumItems() >= 1 &&
      this.minimumItems() <= 500,
  );

  // Execução e resultado
  protected readonly stageIndex = signal(0);
  protected readonly runFailed = signal(false);
  protected readonly result = signal<SampleSelectionResult | null>(null);
  protected readonly aboveMateriality = computed(
    () => this.result()?.items.filter((i) => i.reason === 'Acima da materialidade').length ?? 0,
  );

  // Vínculo com PTA
  protected readonly sampleOpen = signal(false);
  protected readonly linkOpen = signal(false);
  protected readonly linking = signal(false);
  protected readonly linked = signal<LinkOutcome | null>(null);
  protected readonly linkCandidates = computed(() =>
    (this.context.value()?.workpapers ?? []).filter(
      (w) => w.engagementId === this.engagementId() && w.status !== 'finalized',
    ),
  );
  protected readonly linkTarget = linkedSignal(
    () => this.workpaperId() ?? this.linkCandidates()[0]?.id ?? '',
  );

  protected readonly sampleColumns: TableColumn[] = [
    { key: 'document', label: 'Documento', width: '110px' },
    { key: 'date', label: 'Data', width: '100px' },
    { key: 'description', label: 'Descrição' },
    { key: 'amount', label: 'Valor', align: 'right', width: '140px' },
    { key: 'reason', label: 'Critério', width: '190px' },
  ];

  protected stepState(id: Step): 'done' | 'current' | 'upcoming' {
    const current = STEPS.findIndex((s) => s.id === this.step());
    const index = STEPS.findIndex((s) => s.id === id);
    if (index < current) {
      return 'done';
    }
    return index === current ? 'current' : 'upcoming';
  }

  protected run(): void {
    const user = this.session.currentUser();
    if (!this.configValid() || !user) {
      return;
    }
    this.step.set('run');
    this.stageIndex.set(0);
    this.runFailed.set(false);

    const progress$ = interval(STAGE_DURATION_MS).pipe(
      take(RUN_STAGES.length),
      tap((i) => this.stageIndex.set(i + 1)),
      last(),
    );
    const execution$ = this.service.runSampleSelection(
      {
        fileName: this.file()?.name ?? '',
        engagementId: this.engagementId(),
        materiality: this.materiality(),
        method: this.method(),
        minimumItems: this.minimumItems(),
      },
      user.id,
      this.workpaperId(),
    );

    forkJoin([progress$, execution$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([, result]) => {
          this.result.set(result);
          this.step.set('result');
        },
        error: () => this.runFailed.set(true),
      });
  }

  protected download(): void {
    const result = this.result();
    if (result) {
      downloadSampleCsv(result, `amostra-${result.executionId}`);
      this.toast.show('Planilha da amostra gerada (formato CSV compatível com Excel).', 'info');
    }
  }

  protected requestLink(): void {
    if (this.workpaperId()) {
      this.link();
    } else {
      this.linkOpen.set(true);
    }
  }

  protected link(): void {
    const result = this.result();
    const user = this.session.currentUser();
    const target = this.linkTarget();
    if (!result || !user || !target) {
      return;
    }
    this.linking.set(true);
    this.service
      .linkToWorkpaper(result, target, user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (outcome) => {
          this.linked.set(outcome);
          this.linking.set(false);
          this.linkOpen.set(false);
          this.toast.show(`Resultado vinculado ao ${outcome.workpaper.id} como evidência.`);
        },
        error: () => {
          this.linking.set(false);
          this.toast.show('Não foi possível vincular o resultado ao PTA.', 'danger');
        },
      });
  }

  protected openWorkpaper(): void {
    const outcome = this.linked();
    if (outcome) {
      this.router.navigate(['/workpapers', outcome.workpaper.id], {
        queryParams: { highlight: outcome.evidenceId },
      });
    }
  }

  protected restart(): void {
    this.step.set('data');
    this.file.set(null);
    this.result.set(null);
    this.linked.set(null);
    this.stageIndex.set(0);
  }
}
