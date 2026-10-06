import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Button, Card, EmptyState, Icon, KpiCard, LoadingState, PageHeader } from '../../shared/ui';
import { ControlChart } from './control-chart/control-chart';
import { QualityService } from './quality.service';

@Component({
  selector: 'sga-quality-page',
  imports: [PageHeader, KpiCard, Card, ControlChart, EmptyState, LoadingState, Button, Icon],
  template: `
    <div class="page">
      <sga-page-header
        heading="Qualidade & Processos"
        subheading="Visão de qualidade e eficiência operacional dos trabalhos · exclusivo para Sócios"
      >
        <span header-badge class="restricted"
          ><sga-icon name="lock" [size]="12" />Acesso restrito</span
        >
      </sga-page-header>

      @if (dashboard.error()) {
        <sga-card>
          <sga-empty-state
            heading="Não foi possível carregar os indicadores"
            icon="circle-alert"
            tone="danger"
          >
            <button sgaButton type="button" icon="rotate-ccw" (click)="dashboard.reload()">
              Tentar novamente
            </button>
          </sga-empty-state>
        </sga-card>
      } @else {
        @let d = dashboard.value();
        <section class="grid-kpi" aria-label="Indicadores de apoio">
          @if (d) {
            @for (m of d.metrics; track m.id) {
              <sga-kpi-card
                [label]="m.label"
                [value]="m.value"
                [hint]="m.hint"
                [icon]="m.icon"
                [tone]="m.tone"
              />
            }
          } @else {
            @for (i of [1, 2, 3, 4]; track i) {
              <sga-kpi-card label="Carregando…" [loading]="true" />
            }
          }
        </section>

        <sga-card
          heading="Tempo de ciclo de revisão de PTAs"
          subheading="Média semanal, em dias, entre o envio para revisão e a finalização · carta de indivíduos (I-MR)"
        >
          @if (d) {
            <sga-control-chart
              [data]="d.reviewCycle"
              [format]="formatDays"
              periodLabel="Semana"
              label="Carta de controle do tempo de ciclo de revisão de PTAs, em dias, por semana"
            />
            <p class="method meta">
              LC = média · LSC/LIC = média ± 2,66 × amplitude móvel média. Pontos em vermelho
              indicam causa especial a investigar.
            </p>
          } @else {
            <sga-loading-state [rows]="6" label="Carregando carta de controle…" />
          }
        </sga-card>

        <sga-card
          heading="Taxa de retrabalho de PTAs"
          subheading="Percentual de PTAs devolvidos ao preparador por mês · carta p"
        >
          @if (d) {
            <sga-control-chart
              [data]="d.rework"
              [format]="formatPercent"
              periodLabel="Mês"
              label="Carta de controle da taxa de retrabalho de PTAs, em percentual, por mês"
            />
            <p class="method meta">
              LC = p̄ agregado · LSC/LIC = p̄ ± 3·√(p̄(1−p̄)/n), variando com o número de PTAs revisados
              no mês.
            </p>
          } @else {
            <sga-loading-state [rows]="6" label="Carregando carta de controle…" />
          }
        </sga-card>
      }
    </div>
  `,
  styles: `
    .restricted {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--green-950);
      color: var(--green-100);
      font-size: var(--fs-meta);
      font-weight: 500;
    }
    .method {
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border);
    }
  `,
})
export default class QualityPage {
  private readonly service = inject(QualityService);

  protected readonly dashboard = rxResource({ stream: () => this.service.dashboard() });

  protected readonly formatDays = (value: number) =>
    `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`;

  protected readonly formatPercent = (value: number) =>
    `${(value * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}
