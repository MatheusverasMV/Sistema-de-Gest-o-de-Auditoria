export interface Activity {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly target: string;
  readonly link?: string;
  readonly at: string;
}

export interface AppNotification {
  readonly id: string;
  readonly text: string;
  readonly at: string;
  readonly link: string;
  readonly unread: boolean;
}
