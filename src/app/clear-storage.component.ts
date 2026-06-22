import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './shared/services/auth.service.new';

@Component({
  selector: 'app-clear-storage',
  template: `
    <div style="padding: 20px; text-align: center;">
      <h2>Clear All Storage Data</h2>
      <p>This will clear all localStorage, sessionStorage, and reset the application.</p>
      <button (click)="clearAllStorage()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Clear All Data
      </button>
      <div *ngIf="cleared" style="margin-top: 20px; color: green;">
        ✅ All storage cleared successfully! Please refresh the page.
      </div>
    </div>
  `
})
export class ClearStorageComponent {
  cleared = false;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  clearAllStorage() {
    if (isPlatformBrowser(this.platformId)) {
      // Use auth service method to clear storage
      this.authService.clearAllStorage();
      this.cleared = true;
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }
}