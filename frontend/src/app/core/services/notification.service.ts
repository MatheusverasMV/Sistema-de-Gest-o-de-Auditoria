import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityRepository } from '../data/repositories';
import { AppNotification } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly repository = inject(ActivityRepository);

  list(): Observable<AppNotification[]> {
    return this.repository.notifications();
  }
}
