import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

/** Aplicado sobre <button> ou <a> nativos, preservando a semântica do elemento. */
@Component({
  selector: 'button[sgaButton], a[sgaButton]',
  imports: [Icon],
  template: `
    @if (loading()) {
      <sga-icon name="loader" class="spin" [size]="16" />
    } @else if (icon()) {
      <sga-icon [name]="icon()!" [size]="16" />
    }
    <ng-content />
    @if (trailingIcon()) {
      <sga-icon [name]="trailingIcon()!" [size]="16" />
    }
  `,
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--secondary]': "variant() === 'secondary'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--sm]': "size() === 'sm'",
    '[attr.aria-busy]': 'loading() || null',
  },
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly icon = input<string>();
  readonly trailingIcon = input<string>();
  readonly loading = input(false);
}

@Component({
  selector: 'button[sgaIconButton], a[sgaIconButton]',
  imports: [Icon],
  template: `<sga-icon [name]="icon()" [size]="18" />`,
  host: {
    class: 'btn btn--icon',
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--secondary]': "variant() === 'secondary'",
    '[class.btn--sm]': "size() === 'sm'",
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
  },
  styleUrl: './button.scss',
})
export class IconButton {
  readonly icon = input.required<string>();
  /** Obrigatório: o ícone nunca é a única informação disponível para tecnologias assistivas. */
  readonly label = input.required<string>();
  readonly variant = input<'ghost' | 'secondary'>('ghost');
  readonly size = input<ButtonSize>('md');
}
