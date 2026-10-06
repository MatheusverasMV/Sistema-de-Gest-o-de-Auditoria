import { Component, input } from '@angular/core';
import { Card } from '../card/card';
import { Icon } from '../icon/icon';
import { PageHeader } from '../page-header/page-header';
import { EmptyState } from '../states/states';

/** Estrutura padrão para módulos previstos mas ainda não implementados no protótipo. */
@Component({
  selector: 'sga-placeholder-page',
  imports: [PageHeader, Card, EmptyState, Icon],
  template: `
    <div class="page">
      <sga-page-header [heading]="heading()" [subheading]="subheading()" />
      <sga-card>
        <sga-empty-state
          [heading]="emptyHeading()"
          [description]="emptyDescription()"
          [icon]="icon()"
        >
          <ng-content />
        </sga-empty-state>
        <div class="planned">
          <h2 class="planned-title">Previsto para as próximas versões</h2>
          <ul>
            @for (item of planned(); track item) {
              <li><sga-icon name="circle-check" [size]="16" />{{ item }}</li>
            }
          </ul>
        </div>
      </sga-card>
    </div>
  `,
  styles: `
    .planned {
      max-width: 560px;
      margin: 0 auto var(--space-4);
      padding: var(--space-4) var(--space-5);
      border-radius: var(--radius-md);
      background: var(--surface-muted);
      border: 1px solid var(--border);
    }
    .planned-title {
      margin-bottom: var(--space-2);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    ul {
      display: grid;
      gap: var(--space-2);
    }
    li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    sga-icon {
      color: var(--green-500);
    }
  `,
})
export class PlaceholderPage {
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
  readonly icon = input('inbox');
  readonly emptyHeading = input.required<string>();
  readonly emptyDescription = input<string>();
  readonly planned = input<readonly string[]>([]);
}
