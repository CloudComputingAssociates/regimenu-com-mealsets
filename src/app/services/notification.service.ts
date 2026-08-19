// src/app/services/notification.service.ts
// Minimal signal-based toast, mirroring regi-app's NotificationService.show()
// surface (message + type + auto-dismiss). The marketplace only needs the
// simple transient variant.
import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  message: string;
  type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationSignal = signal<Notification | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly notification = this.notificationSignal.asReadonly();

  show(message: string, type: NotificationType = 'success', timeoutMs = 3000): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.notificationSignal.set({ message, type });
    this.timeoutId = setTimeout(() => this.dismiss(), timeoutMs);
  }

  dismiss(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.notificationSignal.set(null);
  }
}
