import { Component, Directive, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/** Estilo padrão para <input>, <select> e <textarea> nativos. */
@Directive({
  selector: 'input[sgaInput], select[sgaInput], textarea[sgaInput]',
  host: { class: 'sga-input' },
})
export class FormInput {}

/** Rótulo + dica para um controle nativo projetado. `for` deve apontar para o id do controle. */
@Component({
  selector: 'sga-form-field',
  template: `
    <label [attr.for]="for()">
      {{ label() }}
      @if (optional()) {
        <span class="optional">(opcional)</span>
      }
    </label>
    <ng-content />
    @if (hint()) {
      <p class="meta" [id]="for() + '-hint'">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    label {
      font-size: 13px;
      font-weight: 500;
    }
    .optional {
      font-weight: 400;
      color: var(--text-muted);
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly hint = input<string>();
  readonly optional = input(false);
}

@Component({
  selector: 'sga-search-input',
  imports: [Icon, FormInput],
  template: `
    <sga-icon name="search" [size]="16" class="icon" />
    <input
      sgaInput
      type="search"
      [attr.aria-label]="label()"
      [placeholder]="placeholder()"
      [value]="value()"
      (input)="onInput($event)"
    />
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      min-width: 220px;
    }
    .icon {
      position: absolute;
      top: 50%;
      left: 10px;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }
    input {
      padding-left: 34px;
    }
  `,
})
export class SearchInput {
  readonly value = model('');
  readonly label = input('Buscar');
  readonly placeholder = input('Buscar…');

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
