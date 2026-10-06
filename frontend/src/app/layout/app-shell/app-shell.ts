import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutlet } from '../../shared/ui/toast/toast-outlet';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

const COLLAPSE_BELOW_PX = 1200;

@Component({
  selector: 'sga-app-shell',
  imports: [RouterOutlet, Sidebar, Topbar, ToastOutlet],
  template: `
    <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
    <sga-sidebar [collapsed]="collapsed()" />
    <div class="column">
      <sga-topbar (toggleSidebar)="collapsed.set(!collapsed())" />
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
  `,
})
export class AppShell {
  protected readonly collapsed = signal(window.innerWidth < COLLAPSE_BELOW_PX);
}
