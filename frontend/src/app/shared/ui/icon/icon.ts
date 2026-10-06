import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  viewChild,
} from '@angular/core';
import { ICONS, IconName, isIconName } from './icons';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Ícone decorativo (aria-hidden). Quando o ícone carrega significado,
 * o componente pai deve fornecer texto visível ou aria-label.
 */
@Component({
  selector: 'sga-icon',
  template: `<svg
    #svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    [attr.width]="size()"
    [attr.height]="size()"
    [attr.stroke-width]="strokeWidth()"
  ></svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName | string>();
  readonly size = input(18);
  readonly strokeWidth = input(1.75);

  private readonly svg = viewChild.required<ElementRef<SVGElement>>('svg');
  private readonly renderer = inject(Renderer2);
  private readonly node = computed(() => {
    const name = this.name();
    return isIconName(name) ? ICONS[name] : ICONS['circle-alert'];
  });

  constructor() {
    effect(() => {
      const svg = this.svg().nativeElement;
      svg.replaceChildren();
      for (const [tag, attrs] of this.node()) {
        const child = this.renderer.createElement(tag, SVG_NS) as SVGElement;
        for (const [key, value] of Object.entries(attrs)) {
          if (value !== undefined) {
            this.renderer.setAttribute(child, key, String(value));
          }
        }
        this.renderer.appendChild(svg, child);
      }
    });
  }
}
