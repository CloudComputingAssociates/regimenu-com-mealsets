// src/app/components/notification/notification.ts
// Root-level toast host. Reads the NotificationService signal and renders a
// dismissible bar. Mounted once in the app shell.
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.notification(); as n) {
      <div class="toast" [class.toast--error]="n.type === 'error'"
        [class.toast--warning]="n.type === 'warning'"
        [class.toast--info]="n.type === 'info'"
        role="status">
        <span class="toast__msg">{{ n.message }}</span>
        <button class="toast__close" (click)="svc.dismiss()" aria-label="Dismiss">✕</button>
      </div>
    }
  `,
  styleUrl: './notification.scss',
})
export class NotificationComponent {
  protected svc = inject(NotificationService);
}
