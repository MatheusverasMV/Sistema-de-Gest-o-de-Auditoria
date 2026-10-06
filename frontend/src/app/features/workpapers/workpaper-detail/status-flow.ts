import { Component, computed, input } from '@angular/core';
import { WORKPAPER_MAIN_FLOW, WORKPAPER_STATUS_META, WorkpaperStatus } from '../../../core/models';
import { Icon, StatusBadge } from '../../../shared/ui';

/** Representação do fluxo do PTA: trilha principal + ramificação de pendência. */
@Component({
  selector: 'sga-workpaper-status-flow',
  imports: [Icon, StatusBadge],
  template: `
    <ol class="steps" aria-label="Fluxo do papel de trabalho">
      @for (step of steps(); track step.status; let last = $last) {
        <li [class]="step.state" [attr.aria-current]="step.state === 'current' ? 'step' : null">
          <span class="marker">
            @if (step.state === 'done') {
              <sga-icon name="check" [size]="14" [strokeWidth]="2.5" />
            } @else {
              {{ $index + 1 }}
            }
          </span>
          <span class="label">{{ step.label }}</span>
          @if (!last) {
            <span class="connector" aria-hidden="true"></span>
          }
        </li>
      }
    </ol>
    <div class="branch" [class.active]="status() === 'with_issues'">
      <sga-icon name="rotate-ccw" [size]="14" />
      <span>Ramificação:</span>
      <span class="branch-path">
        Em revisão
        <sga-icon name="arrow-right" [size]="12" />
        <sga-status-badge
          [label]="issues.label"
          [tone]="status() === 'with_issues' ? issues.tone : 'neutral'"
        />
        <sga-icon name="arrow-right" [size]="12" />
        Em preparação
      </span>
      @if (status() === 'with_issues') {
        <strong class="branch-note">PTA devolvido ao preparador</strong>
      }
    </div>
  `,
  styleUrl: './status-flow.scss',
})
export class WorkpaperStatusFlow {
  readonly status = input.required<WorkpaperStatus>();

  protected readonly issues = WORKPAPER_STATUS_META.with_issues;

  protected readonly steps = computed(() => {
    // "Com pendência" retorna o PTA à preparação: a trilha principal destaca essa etapa.
    const effective = this.status() === 'with_issues' ? 'in_preparation' : this.status();
    const currentIndex = WORKPAPER_MAIN_FLOW.indexOf(effective);
    return WORKPAPER_MAIN_FLOW.map((status, index) => ({
      status,
      label: WORKPAPER_STATUS_META[status].label,
      state:
        index < currentIndex || (status === 'finalized' && index === currentIndex)
          ? 'done'
          : index === currentIndex
            ? 'current'
            : 'upcoming',
    }));
  });
}
