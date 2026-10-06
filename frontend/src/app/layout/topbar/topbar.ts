import {
  CdkMenu,
  CdkMenuGroup,
  CdkMenuItem,
  CdkMenuItemRadio,
  CdkMenuTrigger,
} from '@angular/cdk/menu';
import { Component, computed, inject, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { roleLabel, User } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { RelativeTimePipe } from '../../shared/pipes/pipes';
import { Avatar, FormInput, Icon, IconButton } from '../../shared/ui';

@Component({
  selector: 'sga-topbar',
  imports: [
    FormsModule,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    CdkMenuItemRadio,
    CdkMenuGroup,
    Avatar,
    Icon,
    IconButton,
    FormInput,
    RelativeTimePipe,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly notificationService = inject(NotificationService);

  readonly toggleSidebar = output<void>();

  protected readonly user = this.session.currentUser;
  protected readonly personas = this.session.personas;
  protected readonly roleLabel = roleLabel;
  protected readonly query = signal('');

  protected readonly notifications = rxResource({
    stream: () => this.notificationService.list(),
    defaultValue: [],
  });
  protected readonly unreadCount = computed(
    () => this.notifications.value().filter((n) => n.unread).length,
  );

  protected search(): void {
    const q = this.query().trim();
    this.router.navigate(['/workpapers'], { queryParams: q ? { q } : {} });
  }

  protected openNotification(link: string): void {
    this.router.navigateByUrl(link);
  }

  protected switchPersona(persona: User): void {
    if (persona.id === this.user()?.id) {
      return;
    }
    this.session.switchPersona(persona.id);
    this.toast.show(`Persona alterada para ${persona.name} — ${roleLabel(persona)}`, 'info');
    // Reexecuta os guards da rota atual com a nova persona.
    this.router.navigateByUrl(this.router.url);
  }
}
