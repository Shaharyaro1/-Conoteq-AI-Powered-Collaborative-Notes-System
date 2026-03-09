import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private toastIdCounter = 0;

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 5000) {
    const toast: Toast = {
      id: ++this.toastIdCounter,
      message,
      type,
      duration
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }

    return toast.id;
  }

  removeToast(id: number) {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }

  clearAll() {
    this.toastsSubject.next([]);
  }

  // Convenience methods
  success(message: string, duration?: number) {
    return this.showToast(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.showToast(message, 'error', duration);
  }

  info(message: string, duration?: number) {
    return this.showToast(message, 'info', duration);
  }

  warning(message: string, duration?: number) {
    return this.showToast(message, 'warning', duration);
  }
}