import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { Icon, IconButton } from '../../shared/ui';
import { NAVIGATION, NavItem } from './navigation';

@Component({
  selector: 'sga-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon, IconButton],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '[class.collapsed]': 'collapsed()', '[class.mobile]': 'mobile()' },
})
export class Sidebar {
  private readonly session = inject(SessionService);

  readonly collapsed = input(false);
  /** Abaixo de 768 px a sidebar é uma gaveta sobreposta (App Shell); mostra o botão de fechar. */
  readonly mobile = input(false);
  readonly closeNav = output<void>();

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
