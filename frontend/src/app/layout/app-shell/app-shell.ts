import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ToastOutlet } from '../../shared/ui/toast/toast-outlet';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

const COLLAPSE_BELOW_PX = 1200;
/** Abaixo desta largura a sidebar sai do fluxo e vira gaveta sobreposta. */
const MOBILE_QUERY = '(max-width: 767px)';

@Component({
  selector: 'sga-app-shell',
  imports: [RouterOutlet, Sidebar, Topbar, ToastOutlet],
  template: `
    <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
    <sga-sidebar
      #sidebar
      id="main-navigation"
      [collapsed]="collapsed() && !mobile()"
      [mobile]="mobile()"
      [class.open]="navOpen()"
      [attr.aria-hidden]="mobile() && !navOpen() ? 'true' : null"
      (closeNav)="closeNav()"
      (keydown.escape)="closeNav()"
    />
    @if (navOpen()) {
      <div class="nav-backdrop" aria-hidden="true" (click)="closeNav()"></div>
    }
    <div class="column" [attr.inert]="navOpen() ? '' : null">
      <sga-topbar
        [sidebarCollapsed]="mobile() ? !navOpen() : collapsed()"
        [mobileNav]="mobile()"
        (toggleSidebar)="toggle()"
      />
      <main id="main-content" tabindex="-1">
        <div class="content">
          <router-outlet />
        </div>
      </main>
    </div>
    <sga-toast-outlet />
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100vh;
    }
    sga-sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      flex-shrink: 0;
    }
    .column {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
    }
    sga-topbar {
      position: sticky;
      top: 0;
      z-index: 50;
    }
    main {
      flex: 1;
      outline: none;
    }
    .content {
      max-width: var(--content-max-width);
      margin: 0 auto;
      padding: var(--page-padding);
    }
    .skip-link {
      position: absolute;
      top: -40px;
      left: var(--space-4);
      z-index: 1001;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--surface);
      box-shadow: var(--shadow-md);
    }
    .skip-link:focus {
      top: var(--space-2);
    }
    @media (max-width: 1100px) {
      .content {
        padding: var(--space-5);
      }
    }
    /* Mobile: a sidebar sai do fluxo (o conteúdo usa toda a largura) e abre sobreposta.
       Fechada, fica fora da tela e invisível, para não receber foco. */
    @media (max-width: 767px) {
      sga-sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 960;
        max-width: 85vw;
        box-shadow: var(--shadow-lg);
        transform: translateX(-100%);
        visibility: hidden;
        transition:
          transform 180ms ease,
          visibility 0s linear 180ms;
      }
      sga-sidebar.open {
        transform: none;
        visibility: visible;
        transition: transform 180ms ease;
      }
      .nav-backdrop {
        position: fixed;
        inset: 0;
        z-index: 950;
        background: rgb(29 42 36 / 32%);
      }
      .content {
        padding: var(--space-5) var(--space-4);
      }
    }
  `,
})
export class AppShell {
  private readonly document = inject(DOCUMENT);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly injector = inject(Injector);
  private readonly sidebarRef = viewChild.required('sidebar', { read: ElementRef });

  private readonly media =
    typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;

  protected readonly collapsed = signal(window.innerWidth < COLLAPSE_BELOW_PX);
  protected readonly mobile = signal(this.media?.matches ?? false);
  protected readonly navOpen = signal(false);

  private focusTrap?: FocusTrap;
  /** Elemento focado ao abrir a gaveta (o botão de menu), para devolver o foco ao fechar. */
  private returnFocus: HTMLElement | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    const onMedia = (event: MediaQueryListEvent) => {
      this.mobile.set(event.matches);
      if (!event.matches) {
        this.navOpen.set(false);
      }
    };
    this.media?.addEventListener('change', onMedia);
    destroyRef.onDestroy(() => {
      this.media?.removeEventListener('change', onMedia);
      this.focusTrap?.destroy();
    });

    // Escolher uma rota fecha a gaveta.
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeNav());

    // Gaveta aberta: foco preso nela e rolagem do fundo travada.
    effect(() => {
      const open = this.navOpen();
      this.document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        this.focusTrap ??= this.focusTrapFactory.create(this.sidebarRef().nativeElement, true);
        this.focusTrap.enabled = true;
        this.focusTrap.focusFirstTabbableElementWhenReady();
      } else if (this.focusTrap) {
        this.focusTrap.enabled = false;
      }
    });
  }

  protected toggle(): void {
    if (this.mobile()) {
      if (this.navOpen()) {
        this.closeNav();
      } else {
        this.returnFocus = this.document.activeElement as HTMLElement | null;
        this.navOpen.set(true);
      }
    } else {
      this.collapsed.set(!this.collapsed());
    }
  }

  protected closeNav(): void {
    if (!this.navOpen()) {
      return;
    }
    this.navOpen.set(false);
    // O botão de menu fica na coluna inerte enquanto a gaveta está aberta: só pode receber o
    // foco depois que a coluna for liberada, na próxima renderização.
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target) {
      afterNextRender(() => target.focus(), { injector: this.injector });
    }
  }
}
