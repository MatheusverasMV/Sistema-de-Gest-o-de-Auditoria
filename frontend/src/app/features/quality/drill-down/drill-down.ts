import { Component, computed, input } from '@angular/core';
import { Icon } from '../../../shared/ui';
import { RouterLink } from '@angular/router';
import { UNLINKED_NOTE } from '../quality-links';
import { LinkedDrillDown } from '../quality.service';
import { SEVERITY_META } from '../quality-ui';

/**
 * Conteúdo do painel de detalhe: do sinal estatístico ao registro operacional
 * (cliente → trabalho → área → PTA/evento) e aos pontos de partida da investigação.
 */
@Component({
  selector: 'sga-quality-drill-down',
  imports: [Icon, RouterLink],
  template: `
    @let dd = drill();
    @let d = dd.analysis.definition;

    <section aria-labelledby="dd-signal">
      <h3 id="dd-signal" class="section-label">Sinal</h3>
      @for (s of dd.signals; track s.id) {
        <div [class]="'signal signal--' + severity(s.severity).tone">
          <span class="signal__badge">
            <sga-icon [name]="severity(s.severity).icon" [size]="14" />{{
              severity(s.severity).label
            }}
          </span>
          <strong>{{ s.title }}</strong>
          <p>{{ s.message }}</p>
        </div>
      } @empty {
        <div class="signal signal--success">
          <span class="signal__badge"><sga-icon name="circle-check" [size]="14" />Sem sinal</span>
          <p>Ponto dentro do comportamento esperado para as regras ativas.</p>
        </div>
      }
    </section>

    <section aria-labelledby="dd-observation">
      <h3 id="dd-observation" class="section-label">
        {{ dd.chart === 'moving-range' ? 'Amplitude móvel' : 'Observação' }}
      </h3>
      <div class="observation">
        <span class="observation__value">{{ d.formatLong(dd.point.value) }}</span>
        <span class="meta">
          {{ d.pointPrefix ? d.pointPrefix + ' ' : '' }}{{ dd.point.label }} · {{ statusText() }}
        </span>
      </div>
      <dl class="facts">
        @for (f of dd.point.facts ?? []; track f.label) {
          <div>
            <dt>{{ f.label }}</dt>
            <dd>{{ f.value }}</dd>
          </div>
        }
        <div>
          <dt>LC · LSC · LIC</dt>
          <dd>
            {{ d.formatLong(dd.center) }} · {{ d.formatLong(dd.point.ucl) }} ·
            {{ d.formatLong(dd.point.lcl) }}
          </dd>
        </div>
      </dl>
    </section>

    <section aria-labelledby="dd-chain">
      <h3 id="dd-chain" class="section-label">Onde olhar</h3>
      @if (!dd.links.hasOperationalLink) {
        <p class="unlinked-banner" role="note">
          <sga-icon name="link" [size]="14" />
          {{ unlinkedNote }} A observação, o período, a métrica e o contexto continuam disponíveis
          para a investigação.
        </p>
      }
      @if (dd.links.steps.length) {
        <ol class="chain">
          @for (step of dd.links.steps; track step.label) {
            <li [class]="'chain__step chain__step--' + step.state">
              <span class="chain__label">{{ step.label }}</span>
              <span class="chain__value">{{ step.value }}</span>
              @if (step.link) {
                <a
                  class="chain__link"
                  [routerLink]="step.link.commands"
                  [queryParams]="step.link.queryParams"
                  >{{ step.linkLabel }} <sga-icon name="arrow-up-right" [size]="13"
                /></a>
              } @else if (step.note) {
                <span class="chain__note">
                  <sga-icon
                    [name]="step.state === 'historical' ? 'clock' : 'circle-alert'"
                    [size]="12"
                  />
                  {{ step.note }}
                </span>
              }
            </li>
          }
        </ol>
      }
    </section>

    @if (dd.breakdown.length) {
      <section aria-labelledby="dd-breakdown">
        <h3 id="dd-breakdown" class="section-label">Decomposição de {{ dd.point.label }}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Cliente · trabalho</th>
                <th scope="col">Área</th>
                <th scope="col" class="num">Ocorrências</th>
                <th scope="col" class="num">Taxa</th>
              </tr>
            </thead>
            <tbody>
              @for (row of dd.breakdown; track $index; let first = $first) {
                <tr [class.top]="first && row.count > 0">
                  <td>
                    {{ row.clientName }}<span class="meta"> · {{ row.engagementName }}</span>
                  </td>
                  <td>{{ row.auditArea }}</td>
                  <td class="num">{{ row.count }} de {{ row.exposure }}</td>
                  <td class="num">{{ d.formatLong(row.count / row.exposure) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    @if (dd.related.length) {
      <section aria-labelledby="dd-related">
        <h3 id="dd-related" class="section-label">
          {{ dd.chart === 'moving-range' ? 'Observações comparadas' : 'Observações do padrão' }}
        </h3>
        <ol class="related">
          @for (p of dd.related; track p.id) {
            <li>
              <span>{{ p.label }}</span>
              <span class="meta">{{ p.context?.clientName }} · {{ p.context?.auditArea }}</span>
              <strong>{{ d.formatLong(p.value) }}</strong>
            </li>
          }
        </ol>
      </section>
    }

    @if (dd.point.detail) {
      <section aria-labelledby="dd-context">
        <h3 id="dd-context" class="section-label">Contexto registrado</h3>
        <p class="context">{{ dd.point.detail }}</p>
        <p class="meta">Fator a investigar — não é causa comprovada.</p>
      </section>
    }

    <section aria-labelledby="dd-next">
      <h3 id="dd-next" class="section-label">Possível investigação</h3>
      <ul class="next">
        @for (step of d.investigation; track step) {
          <li>{{ step }}</li>
        }
      </ul>
    </section>

    <p class="caveat">
      <sga-icon name="info" [size]="14" />
      Sinais estatísticos indicam mudança no comportamento do processo. Investigue antes de atribuir
      causa; um ponto fora de controle não comprova erro de uma pessoa.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }
    .section-label {
      margin-bottom: var(--space-2);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .signal {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      border-left: 3px solid currentColor;
    }
    .signal + .signal {
      margin-top: var(--space-2);
    }
    .signal p {
      color: var(--text-primary);
    }
    .signal--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    .signal--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }
    .signal--info {
      background: var(--info-100);
      color: var(--info-700);
    }
    .signal--success {
      background: var(--success-100);
      color: var(--success-700);
    }
    .signal__badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--fs-meta);
      font-weight: 600;
    }
    .signal strong {
      color: var(--text-primary);
    }
    .observation {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .observation__value {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .facts {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin: var(--space-3) 0 0;
      font-size: 13px;
    }
    .facts div {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .facts dt {
      color: var(--text-secondary);
    }
    .facts dd {
      margin: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .chain {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .chain li {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 0 0 var(--space-3) var(--space-5);
    }
    .chain li::before {
      content: '';
      position: absolute;
      top: 6px;
      left: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green-700);
    }
    .chain li:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 16px;
      bottom: 0;
      left: 7px;
      width: 2px;
      background: var(--green-200);
    }
    .chain__label {
      font-size: var(--fs-meta);
      color: var(--text-secondary);
    }
    .chain__value {
      font-weight: 500;
    }
    .chain__step--historical::before,
    .chain__step--unlinked::before {
      background: var(--border-strong);
    }
    .chain__link {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      width: fit-content;
      margin-top: 2px;
      font-size: 13px;
      font-weight: 500;
      color: var(--green-700);
    }
    .chain__note {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      font-size: var(--fs-meta);
      color: var(--text-secondary);
    }
    .unlinked-banner {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--surface-sunken);
      font-size: 13px;
      color: var(--text-secondary);
    }
    .unlinked-banner sga-icon {
      margin-top: 2px;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th,
    td {
      padding: 6px var(--space-2);
      border-bottom: 1px solid var(--border);
      text-align: left;
    }
    th {
      font-size: var(--fs-meta);
      font-weight: 500;
      color: var(--text-secondary);
    }
    .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    tr.top td {
      background: var(--green-50);
      font-weight: 600;
    }
    .related {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
    }
    .related li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
      gap: var(--space-2);
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
    }
    .related strong {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .context {
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--surface-sunken);
    }
    .context + .meta {
      margin-top: var(--space-1);
    }
    .next {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin: 0;
      padding-left: var(--space-5);
    }
    .caveat {
      display: flex;
      gap: var(--space-2);
      font-size: var(--fs-meta);
      color: var(--text-secondary);
    }
    .caveat sga-icon {
      margin-top: 1px;
    }
  `,
})
export class QualityDrillDown {
  readonly drill = input.required<LinkedDrillDown>();

  protected readonly unlinkedNote = UNLINKED_NOTE;

  protected severity(severity: keyof typeof SEVERITY_META) {
    return SEVERITY_META[severity];
  }

  protected readonly statusText = computed(() => {
    const p = this.drill().point;
    if (p.value > p.ucl) return 'acima do LSC';
    if (p.value < p.lcl) return 'abaixo do LIC';
    return 'dentro dos limites';
  });
}
