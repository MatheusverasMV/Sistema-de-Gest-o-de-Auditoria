import { A11yModule } from '@angular/cdk/a11y';
import { Component, input, model } from '@angular/core';
import { IconButton } from '../button/button';

/** Painel lateral modal. Fecha com Esc, clique no fundo ou botão de fechar; mantém o foco preso enquanto aberto. */
@Component({
  selector: 'sga-drawer',
  imports: [A11yModule, IconButton],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="open.set(false)" aria-hidden="true"></div>
      <aside
        class="panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [style.width.px]="width()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown.escape)="open.set(false)"
      >
        <header>
          <div class="titles">
            <h2 class="section-title" [id]="titleId">{{ heading() }}</h2>
            @if (subheading()) {
              <p class="meta">{{ subheading() }}</p>
            }
          </div>
          <button
            sgaIconButton
            type="button"
            icon="x"
            label="Fechar painel"
            (click)="open.set(false)"
          ></button>
        </header>
        <div class="body"><ng-content /></div>
        <footer><ng-content select="[drawer-footer]" /></footer>
      </aside>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 900;
      background: rgb(18 61 43 / 28%);
      animation: fade 150ms ease;
    }
    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 901;
      display: flex;
      flex-direction: column;
      max-width: 100vw;
      background: var(--surface);
      box-shadow: var(--shadow-lg);
      animation: slide 180ms ease-out;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--border);
    }
    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-5) var(--space-6);
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--border);
    }
    footer:empty {
      display: none;
    }
    @keyframes slide {
      from {
        transform: translateX(24px);
        opacity: 0;
      }
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class Drawer {
  private static nextId = 0;

  readonly open = model(false);
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
  readonly width = input(520);

  protected readonly titleId = `sga-drawer-${++Drawer.nextId}`;
}
