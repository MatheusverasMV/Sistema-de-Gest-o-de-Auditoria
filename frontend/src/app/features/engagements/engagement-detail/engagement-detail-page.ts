import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ENGAGEMENT_STATUS_META, RISK_META } from '../../../core/models';
import { CalendarDatePipe } from '../../../shared/pipes/pipes';
import {
  BreadcrumbItem,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Person,
  StatusBadge,
  TabItem,
  Tabs,
} from '../../../shared/ui';
import { WorkpaperTable } from '../../workpapers/workpaper-table';
import { EngagementService } from '../engagement.service';
import {
  AdjustmentsTab,
  ConclusionTab,
  EvidencesTab,
  MaterialityTab,
  OverviewTab,
  PlanningTab,
  RisksTab,
} from './engagement-tabs';

const TAB_IDS = [
  'overview',
  'planning',
  'risks',
  'materiality',
  'workpapers',
  'evidences',
  'adjustments',
  'conclusion',
] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string | undefined): value is TabId {
  return TAB_IDS.includes(value as TabId);
}

@Component({
  selector: 'sga-engagement-detail-page',
  imports: [
    RouterLink,
    PageHeader,
    Tabs,
    Card,
    StatusBadge,
    Person,
    EmptyState,
    LoadingState,
    Button,
    CalendarDatePipe,
    WorkpaperTable,
    OverviewTab,
    PlanningTab,
    RisksTab,
    MaterialityTab,
    EvidencesTab,
    AdjustmentsTab,
    ConclusionTab,
  ],
  templateUrl: './engagement-detail-page.html',
  styleUrl: './engagement-detail-page.scss',
})
export default class EngagementDetailPage {
  private readonly service = inject(EngagementService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Parâmetro de rota. */
  readonly id = input.required<string>();
  /** Query param opcional para abrir uma aba específica (?tab=workpapers). */
  readonly tab = input<string>();

  protected readonly status = ENGAGEMENT_STATUS_META;
  protected readonly risk = RISK_META;

  protected readonly detail = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.service.detail(params),
  });

  protected readonly activeTab = linkedSignal<TabId>(() => {
    const tab = this.tab();
    return isTabId(tab) ? tab : 'overview';
  });

  protected readonly tabs = computed<TabItem[]>(() => {
    const d = this.detail.value();
    const evidenceCount = d?.workpapers.reduce((sum, w) => sum + w.evidences.length, 0);
    return [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'planning', label: 'Planejamento' },
      { id: 'risks', label: 'Riscos', count: d?.engagement.risks.length },
      { id: 'materiality', label: 'Materialidade' },
      { id: 'workpapers', label: 'PTAs', count: d?.workpapers.length },
      { id: 'evidences', label: 'Evidências', count: evidenceCount },
      { id: 'adjustments', label: 'Ajustes', count: d?.engagement.adjustments.length },
      { id: 'conclusion', label: 'Conclusão' },
    ];
  });

  protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
    { label: 'Trabalhos', link: '/engagements' },
    { label: this.detail.value()?.engagement.client ?? 'Trabalho' },
  ]);

  protected readonly workpaperRows = computed(() =>
    (this.detail.value()?.workpapers ?? []).map((workpaper) => ({ workpaper })),
  );

  protected selectTab(id: string): void {
    if (!isTabId(id)) {
      return;
    }
    this.activeTab.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: id === 'overview' ? null : id },
      replaceUrl: true,
    });
  }
}
