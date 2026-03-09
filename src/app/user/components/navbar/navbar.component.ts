import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ApiService, NotificationUpdate } from '../../../shared/services/api.service';
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
  id: string;
  type: 'approved' | 'rejected';
  title: string;
  message: string;
  time: string;
  noteId: number;
  noteName: string;
  read?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})

export class NavbarComponent implements OnInit, OnDestroy {
  userName = 'John Doe';
  userInitial = '';
  showDropdown = false;
  showNotifications = false;
  statusUpdatesCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  notifications: NotificationItem[] = [];
  private subscriptions: Subscription[] = [];
  private storageListener: any;
  private lastStatusCheck: { [key: number]: string } = {};

  constructor(
    private authService: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      // Use username if name is not available
      this.userName = currentUser.name || currentUser.username || 'User';
      this.userInitial = this.userName.charAt(0).toUpperCase();
    }

    // Subscribe to API service notification updates
    const notificationSubscription = this.apiService.notificationUpdates$.subscribe(updates => {
      this.handleNotificationUpdates(updates);
    });

    // Subscribe to notification service
    const serviceSubscription = this.notificationService.userNotifications$.subscribe(data => {
      this.statusUpdatesCount = data.statusUpdatesCount;
      this.approvedCount = data.approvedCount;
      this.rejectedCount = data.rejectedCount;
    });

    this.subscriptions.push(notificationSubscription, serviceSubscription);

    if (isPlatformBrowser(this.platformId)) {
      // Load existing notifications
      this.loadExistingNotifications();
      
      // Initialize status tracking
      this.initializeStatusTracking();
      this.updateNotificationCounts();

      // Listen for localStorage changes
      this.storageListener = (e: StorageEvent) => {
        if (e.key === 'uploadedNotes') {
          this.updateNotificationCounts();
        }
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (isPlatformBrowser(this.platformId) && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  initializeStatusTracking() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('uploadedNotes');
    const existingCheck = localStorage.getItem('userLastStatusCheck');
    
    if (savedNotes) {
      const notes: Note[] = JSON.parse(savedNotes);
      
      // If no existing check, initialize with current status
      if (!existingCheck) {
        notes.forEach(note => {
          // Track all notes including pending ones
          this.lastStatusCheck[note.id] = note.status;
        });
        localStorage.setItem('userLastStatusCheck', JSON.stringify(this.lastStatusCheck));
      } else {
        // Load existing check
        this.lastStatusCheck = JSON.parse(existingCheck);
        
        // Add any new notes that aren't tracked yet (keep as pending)
        notes.forEach(note => {
          if (!(note.id in this.lastStatusCheck)) {
            this.lastStatusCheck[note.id] = note.status;
            // Save immediately to track new uploads
            localStorage.setItem('userLastStatusCheck', JSON.stringify(this.lastStatusCheck));
          }
        });
      }
    }
  }

  updateNotificationCounts() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('uploadedNotes');
    const lastCheck = localStorage.getItem('userLastStatusCheck');
    const savedNotifications = localStorage.getItem('userNotifications');
    
    if (savedNotes) {
      const notes: Note[] = JSON.parse(savedNotes);
      const previousCheck = lastCheck ? JSON.parse(lastCheck) : {};
      
      let newApproved = 0;
      let newRejected = 0;
      let totalUpdates = 0;
      const newNotifications: NotificationItem[] = [];
      const updatedStatusCheck: { [key: number]: string } = { ...previousCheck };

      notes.forEach(note => {
        const previousStatus = previousCheck[note.id];
        
        // Debug logging (remove in production)
        if (previousStatus !== note.status) {
          console.log(`[Notification] Status change detected for "${note.notesName}":`, 
            `${previousStatus} -> ${note.status}`);
        }
        
        // Check if status changed from pending to approved/rejected
        if (previousStatus === 'pending' && note.status === 'approved') {
          newApproved++;
          totalUpdates++;
          
          console.log(`[Notification] Creating APPROVED notification for "${note.notesName}"`);
          
          // Create notification
          newNotifications.push({
            id: `${note.id}-approved-${Date.now()}`,
            type: 'approved',
            title: 'Notes Approved! ✅',
            message: `Your notes "${note.notesName}" has been approved by admin.`,
            time: this.getTimeAgo(new Date()),
            noteId: note.id,
            noteName: note.notesName,
            read: false
          });
          
          // Update status check immediately
          updatedStatusCheck[note.id] = 'approved';
        } else if (previousStatus === 'pending' && note.status === 'rejected') {
          newRejected++;
          totalUpdates++;
          
          console.log(`[Notification] Creating REJECTED notification for "${note.notesName}"`);
          
          // Create notification
          newNotifications.push({
            id: `${note.id}-rejected-${Date.now()}`,
            type: 'rejected',
            title: 'Notes Rejected ❌',
            message: `Your notes "${note.notesName}" has been rejected by admin.`,
            time: this.getTimeAgo(new Date()),
            noteId: note.id,
            noteName: note.notesName,
            read: false
          });
          
          // Update status check immediately
          updatedStatusCheck[note.id] = 'rejected';
        } else {
          // Keep current status in tracking
          updatedStatusCheck[note.id] = note.status;
        }
      });

      // Only update if there are new notifications
      if (newNotifications.length > 0) {
        // Load existing notifications and merge with new ones
        if (savedNotifications) {
          const existingNotifications: NotificationItem[] = JSON.parse(savedNotifications);
          this.notifications = [...newNotifications, ...existingNotifications];
        } else {
          this.notifications = newNotifications;
        }

        // Save notifications to localStorage
        localStorage.setItem('userNotifications', JSON.stringify(this.notifications));
        
        // Update status check to prevent duplicate notifications
        localStorage.setItem('userLastStatusCheck', JSON.stringify(updatedStatusCheck));
        this.lastStatusCheck = updatedStatusCheck;
      } else {
        // Load existing notifications even if no new ones
        if (savedNotifications) {
          this.notifications = JSON.parse(savedNotifications);
        }
      }

      // Count total unread notifications
      const totalUnread = this.notifications.filter(n => !n.read).length;
      
      this.approvedCount = this.notifications.filter(n => n.type === 'approved' && !n.read).length;
      this.rejectedCount = this.notifications.filter(n => n.type === 'rejected' && !n.read).length;
      this.statusUpdatesCount = totalUnread;

      console.log(`[Navbar] Updated counts - Total: ${totalUnread}, Approved: ${this.approvedCount}, Rejected: ${this.rejectedCount}`);

      // Update notification service
      this.notificationService.updateUserNotifications({
        pendingCount: 0,
        statusUpdatesCount: totalUnread,
        approvedCount: this.approvedCount,
        rejectedCount: this.rejectedCount
      });
    } else {
      // Load existing notifications even if no notes
      if (savedNotifications) {
        this.notifications = JSON.parse(savedNotifications);
      }
      
      this.approvedCount = 0;
      this.rejectedCount = 0;
      this.statusUpdatesCount = 0;

      // Update notification service
      this.notificationService.updateUserNotifications({
        pendingCount: 0,
        statusUpdatesCount: 0,
        approvedCount: 0,
        rejectedCount: 0
      });
    }
  }

  // Call this when user visits upload-notes page to mark notifications as seen
  markNotificationsAsSeen() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('uploadedNotes');
    if (savedNotes) {
      const notes: Note[] = JSON.parse(savedNotes);
      const newStatusCheck: { [key: number]: string } = {};
      
      notes.forEach(note => {
        newStatusCheck[note.id] = note.status;
      });
      
      localStorage.setItem('userLastStatusCheck', JSON.stringify(newStatusCheck));
      this.lastStatusCheck = newStatusCheck;
      this.statusUpdatesCount = 0;
      this.approvedCount = 0;
      this.rejectedCount = 0;
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

  goToProfile() {
    this.router.navigate(['/user/profile']);
    this.showDropdown = false;
  }

  goToSettings() {
    this.router.navigate(['/user/settings']);
    this.showDropdown = false;
  }

  // Notification dropdown methods
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showDropdown = false; // Close user dropdown if open
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  getTotalNotifications(): number {
    return this.notifications.length;
  }

  getNotificationBadgeClass(): string {
    if (this.notifications.length === 0) return '';
    
    const hasApproved = this.notifications.some(n => n.type === 'approved');
    const hasRejected = this.notifications.some(n => n.type === 'rejected');
    
    if (hasApproved && hasRejected) return 'mixed';
    if (hasApproved) return 'has-approved';
    if (hasRejected) return 'has-rejected';
    
    return '';
  }

  getNotificationClass(type: string): string {
    return `notification-${type}`;
  }

  dismissNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('userNotifications', JSON.stringify(this.notifications));
    }
    this.updateNotificationCounts();
  }

  clearAllNotifications() {
    this.notifications = [];
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('userNotifications', JSON.stringify(this.notifications));
    }
    this.updateNotificationCounts();
  }

  handleNotificationUpdates(updates: NotificationUpdate[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    updates.forEach(update => {
      console.log(`[Navbar] Received notification update:`, update);
      
      // Create notification item
      const notification: NotificationItem = {
        id: `${update.noteId}-${update.newStatus}-${Date.now()}`,
        type: update.newStatus as 'approved' | 'rejected',
        title: update.newStatus === 'approved' ? 'Notes Approved! ✅' : 'Notes Rejected ❌',
        message: `Your notes "${update.noteName}" has been ${update.newStatus} by admin.`,
        time: this.getTimeAgo(new Date(update.timestamp)),
        noteId: update.noteId,
        noteName: update.noteName,
        read: false
      };

      // Add to notifications array
      this.notifications.unshift(notification);
      
      // Save to localStorage
      localStorage.setItem('userNotifications', JSON.stringify(this.notifications));
      
      // Update counts
      this.updateNotificationCounts();
      
      console.log(`[Navbar] Added notification for "${update.noteName}" - ${update.newStatus}`);
    });
  }

  loadExistingNotifications() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotifications = localStorage.getItem('userNotifications');
    if (savedNotifications) {
      this.notifications = JSON.parse(savedNotifications);
      console.log(`[Navbar] Loaded ${this.notifications.length} existing notifications`);
    }
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
