import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

export interface BreadcrumbItem {
  readonly label: string;
  readonly link?: string | readonly unknown[];
  readonly queryParams?: Record<string, string>;
}

@Component({
  selector: 'sga-breadcrumb',
  imports: [RouterLink, Icon],
  template: `
    <nav aria-label="Trilha de navegação">
      <ol>
        @for (item of items(); track item.label; let last = $last) {
          <li>
            @if (item.link && !last) {
              <a [routerLink]="item.link" [queryParams]="item.queryParams">{{ item.label }}</a>
              <sga-icon name="chevron-right" [size]="12" class="separator" />
            } @else {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  // Trilha discreta: links em verde-intermediário, item atual em verde-escuro, separador leve.
  styles: `
    ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-2);
      font-size: var(--fs-small);
      line-height: 1.4;
      color: var(--text-secondary);
    }
    li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    a {
      color: var(--link);
    }
    a:hover {
      color: var(--text-primary);
    }
    .separator {
      color: var(--border-strong);
    }
    [aria-current] {
      color: var(--text-primary);
    }
  `,
})
export class Breadcrumb {
  readonly items = input.required<readonly BreadcrumbItem[]>();
}
