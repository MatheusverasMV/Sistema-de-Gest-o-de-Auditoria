import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { Icon } from '../../shared/ui';
import { NAVIGATION, NavItem } from './navigation';

@Component({
  selector: 'sga-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '[class.collapsed]': 'collapsed()' },
})
export class Sidebar {
  private readonly session = inject(SessionService);

  readonly collapsed = input(false);

  protected readonly sections = computed(() => {
    const user = this.session.currentUser();
    return NAVIGATION.map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.requires || item.requires(user)),
    })).filter((section) => section.items.length > 0);
  });

  /** Nome do item recolhido (tooltip e leitor de tela), sem perder a indicação de restrição. */
  protected collapsedName(item: NavItem): string {
    return item.requires ? `${item.label} (restrito a Sócios)` : item.label;
  }
}
