import { Component, computed, inject, input } from '@angular/core';
import { initials, roleLabel } from '../../../core/models';
import { PeopleService } from '../../../core/services/people.service';

const PALETTE = ['#1F6B45', '#185238', '#3A8C5C', '#2E5E4E', '#46745A', '#123D2B'];

@Component({
  selector: 'sga-avatar',
  template: `{{ text() }}`,
  host: {
    'aria-hidden': 'true',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.4',
    '[style.background]': 'color()',
  },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 50%;
      color: #fff;
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
    }
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(32);

  protected readonly text = computed(() => initials(this.name()));
  protected readonly color = computed(() => {
    const hash = [...this.name()].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return PALETTE[hash % PALETTE.length];
  });
}

/** Avatar + nome (+ cargo opcional) resolvidos a partir do id do usuário. */
@Component({
  selector: 'sga-person',
  imports: [Avatar],
  template: `
    <sga-avatar [name]="name()" [size]="size()" />
    <span class="text">
      <span class="name">{{ name() }}</span>
      @if (showRole() && role()) {
        <span class="meta">{{ role() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.3;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class Person {
  private readonly people = inject(PeopleService);

  readonly userId = input.required<string>();
  readonly size = input(24);
  readonly showRole = input(false);

  private readonly user = computed(() => this.people.byId(this.userId()));
  protected readonly name = computed(() => this.user()?.name ?? 'Usuário removido');
  protected readonly role = computed(() => {
    const user = this.user();
    return user ? roleLabel(user) : '';
  });
}
