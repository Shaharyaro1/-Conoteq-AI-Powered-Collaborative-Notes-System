import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NotificationData {
  pendingCount: number;
  statusUpdatesCount: number;
  approvedCount: number;
  rejectedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private adminNotifications = new BehaviorSubject<NotificationData>({
    pendingCount: 0,
    statusUpdatesCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  });

  private userNotifications = new BehaviorSubject<NotificationData>({
    pendingCount: 0,
    statusUpdatesCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  });

  adminNotifications$ = this.adminNotifications.asObservable();
  userNotifications$ = this.userNotifications.asObservable();

  updateAdminNotifications(data: NotificationData) {
    this.adminNotifications.next(data);
  }

  updateUserNotifications(data: NotificationData) {
    this.userNotifications.next(data);
  }

  clearUserNotifications() {
    this.userNotifications.next({
      pendingCount: 0,
      statusUpdatesCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    });
  }
}