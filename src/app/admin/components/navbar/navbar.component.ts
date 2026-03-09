import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';

interface Note {
  id: number;
  notesName: string;
  subject: string;
  teacherName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
}


@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class AdminNavbarComponent implements OnInit, OnDestroy {
  adminName = 'Admin User';
  adminInitial = '';
  showDropdown = false;
  showNotifications = false;
  pendingNotesCount = 0;
  totalNotesCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  private storageListener: any;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      // Use username if name is not available
      this.adminName = currentUser.name || currentUser.username || 'Admin';
      this.adminInitial = this.adminName.charAt(0).toUpperCase();
    }

    if (isPlatformBrowser(this.platformId)) {
      // Initial count
      this.updatePendingNotesCount();

      // Listen for localStorage changes
      this.storageListener = (e: StorageEvent) => {
        if (e.key === 'uploadedNotes') {
          this.updatePendingNotesCount();
        }
      };
      window.addEventListener('storage', this.storageListener);

      // Also check periodically for same-tab updates
      setInterval(() => {
        this.updatePendingNotesCount();
      }, 2000);
    }

    // Subscribe to notification service
    this.notificationService.adminNotifications$.subscribe(data => {
      this.pendingNotesCount = data.pendingCount;
    });
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId) && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }



  updatePendingNotesCount() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('uploadedNotes');
    if (savedNotes) {
      const notes: Note[] = JSON.parse(savedNotes);
      this.pendingNotesCount = notes.filter(note => note.status === 'pending').length;
      this.approvedCount = notes.filter(note => note.status === 'approved').length;
      this.rejectedCount = notes.filter(note => note.status === 'rejected').length;
      this.totalNotesCount = notes.length;
      
      // Update notification service
      this.notificationService.updateAdminNotifications({
        pendingCount: this.pendingNotesCount,
        statusUpdatesCount: 0,
        approvedCount: this.approvedCount,
        rejectedCount: this.rejectedCount
      });
    } else {
      this.pendingNotesCount = 0;
      this.approvedCount = 0;
      this.rejectedCount = 0;
      this.totalNotesCount = 0;
      
      // Update notification service
      this.notificationService.updateAdminNotifications({
        pendingCount: 0,
        statusUpdatesCount: 0,
        approvedCount: 0,
        rejectedCount: 0
      });
    }
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    this.showNotifications = false; // Close notifications if open
  }

  closeDropdown() {
    this.showDropdown = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  goToSettings() {
    this.router.navigate(['/admin/settings']);
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showDropdown = false; // Close user dropdown if open
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  getTotalNotifications(): number {
    return this.pendingNotesCount;
  }

  goToNotes() {
    this.router.navigate(['/admin/notes']);
    this.closeNotifications();
  }
}
