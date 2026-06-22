import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service.new';
import { NotificationService } from '../../../shared/services/notification.service';
import { ApiService } from '../../../shared/services/api.service.new';
import { Subscription } from 'rxjs';

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
  adminName = '';
  adminInitial = '';
  showDropdown = false;
  showNotifications = false;
  pendingNotesCount = 0;
  totalNotesCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  private storageListener: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Listen for clicks outside the component
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const navbar = target.closest('.navbar');
    
    // If click is outside navbar, close all dropdowns
    if (!navbar) {
      this.showDropdown = false;
      this.showNotifications = false;
    }
  }

  // Listen for escape key
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    this.showDropdown = false;
    this.showNotifications = false;
  }

  ngOnInit() {
    // Subscribe to current user changes
    const userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.adminName = user.username || 'Admin';
        this.adminInitial = this.adminName.charAt(0).toUpperCase();
      } else {
        this.adminName = '';
        this.adminInitial = '';
      }
    });

    this.subscriptions.push(userSubscription);

    if (isPlatformBrowser(this.platformId)) {
      // Initial count from API
      this.updatePendingNotesCount();

      // Listen for localStorage changes (for backward compatibility)
      this.storageListener = (e: StorageEvent) => {
        if (e.key === 'uploadedNotes') {
          this.updatePendingNotesCount();
        }
      };
      window.addEventListener('storage', this.storageListener);

      // Check periodically for real-time updates from API
      setInterval(() => {
        this.updatePendingNotesCount();
      }, 5000); // Check every 5 seconds for real-time updates
    }

    // Subscribe to notification service
    const notificationSubscription = this.notificationService.adminNotifications$.subscribe(data => {
      this.pendingNotesCount = data.pendingCount;
      this.approvedCount = data.approvedCount;
      this.rejectedCount = data.rejectedCount;
    });
    
    // Subscribe to API notification updates
    const apiNotificationSubscription = this.apiService.notificationUpdates$.subscribe(updates => {
      console.log('📬 Admin navbar received notification updates:', updates);
      // Refresh counts when notifications arrive
      this.updatePendingNotesCount();
    });
    
    this.subscriptions.push(notificationSubscription, apiNotificationSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (isPlatformBrowser(this.platformId) && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }



  updatePendingNotesCount() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    console.log('🔄 Updating notes counts from API...');
    
    // Fetch notes from API instead of localStorage
    this.apiService.getAllNotes().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const notes: Note[] = response.data;
          
          this.pendingNotesCount = notes.filter(note => note.status === 'pending').length;
          this.approvedCount = notes.filter(note => note.status === 'approved').length;
          this.rejectedCount = notes.filter(note => note.status === 'rejected').length;
          this.totalNotesCount = notes.length;
          
          console.log('✅ Notes counts updated:', {
            pending: this.pendingNotesCount,
            approved: this.approvedCount,
            rejected: this.rejectedCount,
            total: this.totalNotesCount
          });
          
          // Update notification service
          this.notificationService.updateAdminNotifications({
            pendingCount: this.pendingNotesCount,
            statusUpdatesCount: 0,
            approvedCount: this.approvedCount,
            rejectedCount: this.rejectedCount
          });
        }
      },
      error: (error) => {
        console.error('❌ Error fetching notes counts:', error);
        
        // Fallback to localStorage if API fails
        const savedNotes = localStorage.getItem('uploadedNotes');
        if (savedNotes) {
          const notes: Note[] = JSON.parse(savedNotes);
          this.pendingNotesCount = notes.filter(note => note.status === 'pending').length;
          this.approvedCount = notes.filter(note => note.status === 'approved').length;
          this.rejectedCount = notes.filter(note => note.status === 'rejected').length;
          this.totalNotesCount = notes.length;
          
          console.log('⚠️ Using localStorage fallback for counts');
          
          // Update notification service
          this.notificationService.updateAdminNotifications({
            pendingCount: this.pendingNotesCount,
            statusUpdatesCount: 0,
            approvedCount: this.approvedCount,
            rejectedCount: this.rejectedCount
          });
        } else {
          // No data available
          this.pendingNotesCount = 0;
          this.approvedCount = 0;
          this.rejectedCount = 0;
          this.totalNotesCount = 0;
          
          this.notificationService.updateAdminNotifications({
            pendingCount: 0,
            statusUpdatesCount: 0,
            approvedCount: 0,
            rejectedCount: 0
          });
        }
      }
    });
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    this.showNotifications = false; // Close notifications if open
  }

  closeDropdown() {
    this.showDropdown = false;
  }

  // Close all dropdowns
  closeAllDropdowns() {
    this.showDropdown = false;
    this.showNotifications = false;
  }

  logout() {
    console.log('🚪 Admin Navbar: Logout clicked');
    this.authService.logout();
    // Auth service will handle the redirect to login
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
