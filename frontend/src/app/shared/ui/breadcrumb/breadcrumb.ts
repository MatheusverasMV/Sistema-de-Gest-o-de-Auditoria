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
              <sga-icon name="chevron-right" [size]="14" />
            } @else {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1);
      font-size: 13px;
      color: var(--text-secondary);
    }
    li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }
    a {
      color: var(--text-secondary);
    }
    a:hover {
      color: var(--brand);
    }
    [aria-current] {
      color: var(--text-primary);
      font-weight: 500;
    }
  `,
})
export class Breadcrumb {
  readonly items = input.required<readonly BreadcrumbItem[]>();
}
