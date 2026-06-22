import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service.new';
import { NotificationService } from '../../../shared/services/notification.service';
import { ApiService, NotificationUpdate, ApiNotification } from '../../../shared/services/api.service.new';
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

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  noteId?: number;
  noteName?: string;
  isRead: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})

export class NavbarComponent implements OnInit, OnDestroy {
  userName = '';
  userInitial = '';
  showDropdown = false;
  showNotifications = false;
  statusUpdatesCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  notifications: NotificationItem[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Subscribe to current user changes
    const userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.username || 'User';
        this.userInitial = this.userName.charAt(0).toUpperCase();
      } else {
        this.userName = '';
        this.userInitial = '';
      }
    });

    // Subscribe to API notifications
    const apiNotificationsSubscription = this.apiService.notifications$.subscribe(notifications => {
      this.handleApiNotifications(notifications);
    });

    // Subscribe to notification service
    const serviceSubscription = this.notificationService.userNotifications$.subscribe(data => {
      this.statusUpdatesCount = data.statusUpdatesCount;
      this.approvedCount = data.approvedCount;
      this.rejectedCount = data.rejectedCount;
    });

    this.subscriptions.push(userSubscription, apiNotificationsSubscription, serviceSubscription);

    if (isPlatformBrowser(this.platformId)) {
      // Load notifications from API
      this.loadNotifications();
      
      // Add document click listener to close dropdowns when clicking outside
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const navbar = document.querySelector('.navbar');
        
        // If click is outside navbar, close all dropdowns
        if (navbar && !navbar.contains(target)) {
          this.closeAllDropdowns();
        }
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadNotifications() {
    // Notifications are automatically loaded by the API service
    // and will be received through the notifications$ subscription
  }

  private handleApiNotifications(notifications: ApiNotification[]) {
    // Convert API notifications to display format
    this.notifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      time: this.getTimeAgo(notification.createdAt),
      noteId: notification.noteId,
      noteName: notification.noteName,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    }));

    // Update counts
    this.updateNotificationCounts();
  }

  private updateNotificationCounts() {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    
    this.statusUpdatesCount = unreadNotifications.length;
    this.approvedCount = unreadNotifications.filter(n => n.type === 'approved').length;
    this.rejectedCount = unreadNotifications.filter(n => n.type === 'rejected').length;

    console.log(`[Navbar] Updated counts - Total: ${this.statusUpdatesCount}, Approved: ${this.approvedCount}, Rejected: ${this.rejectedCount}`);

    // Update notification service
    this.notificationService.updateUserNotifications({
      pendingCount: 0,
      statusUpdatesCount: this.statusUpdatesCount,
      approvedCount: this.approvedCount,
      rejectedCount: this.rejectedCount
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
    console.log('🚪 User Navbar: Logout clicked');
    this.authService.logout();
    // Auth service will handle the redirect to login
  }

  goToProfile() {
    this.router.navigate(['/user/profile']);
    this.closeAllDropdowns();
  }

  goToSettings() {
    this.router.navigate(['/user/settings']);
    this.closeAllDropdowns();
  }

  // Notification bell click - Navigate to notes page directly
  onNotificationBellClick() {
    console.log('🔔 Notification bell clicked - navigating to notes page');
    // Navigate to upload-notes page where user can see all their notes with status
    this.router.navigate(['/user/upload-notes']);
    // Mark notifications as seen
    this.markNotificationsAsSeen();
  }

  // Legacy methods (kept for compatibility)
  toggleNotifications() {
    // Now redirects to notes page instead of showing dropdown
    this.onNotificationBellClick();
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  getTotalNotifications(): number {
    return this.notifications.length;
  }

  getNotificationBadgeClass(): string {
    if (this.notifications.length === 0) return '';
    
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    const hasApproved = unreadNotifications.some(n => n.type === 'approved');
    const hasRejected = unreadNotifications.some(n => n.type === 'rejected');
    
    if (hasApproved && hasRejected) return 'mixed';
    if (hasApproved) return 'has-approved';
    if (hasRejected) return 'has-rejected';
    
    return '';
  }

  getNotificationClass(type: string): string {
    return `notification-${type}`;
  }

  dismissNotification(notificationId: number) {
    // Mark notification as read via API
    this.apiService.markNotificationAsRead(notificationId).subscribe({
      next: (success) => {
        if (success) {
          console.log(`[Navbar] Notification ${notificationId} marked as read`);
        }
      },
      error: (error) => {
        console.error('Failed to mark notification as read:', error);
      }
    });
  }

  clearAllNotifications() {
    // Mark all notifications as read via API
    this.apiService.markAllNotificationsAsRead().subscribe({
      next: (success) => {
        if (success) {
          console.log('[Navbar] All notifications marked as read');
        }
      },
      error: (error) => {
        console.error('Failed to mark all notifications as read:', error);
      }
    });
  }


  // Call this when user visits upload-notes page to mark notifications as seen
  markNotificationsAsSeen() {
    this.clearAllNotifications();
  }


  getTimeAgo(date: Date | string): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(targetDate.getTime())) {
      return 'Unknown time';
    }
    
    const diffMs = now.getTime() - targetDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, show formatted date
    return targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
