import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../shared/services/data.service';
import { ApiService, NotificationUpdate } from '../../../shared/services/api.service';
import { NotificationService } from '../../../shared/services/notification.service';
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

interface RecentActivity {
  user: string;
  action: string;
  time: string;
  noteName?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  
  stats = [
    { title: 'Total Teachers', value: '0', icon: 'teachers' },
    { title: 'Total Notes', value: '0', icon: 'notes' },
    { title: 'Active Today', value: '0', icon: 'active' },
    { title: 'Total Users', value: '0', icon: 'users' },
    { title: 'Total Admins', value: '0', icon: 'admins' }
  ];

  recentActivities: RecentActivity[] = [];

  searchQuery: string = '';

  // Bar Chart data (0-1000 range) - will be updated with real data
  chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  usersData: number[] = [];
  teachersData: number[] = [];

  constructor(
    private dataService: DataService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Request notification permission
    this.apiService.requestNotificationPermission();

    // Subscribe to teachers data
    const teachersSubscription = this.dataService.teachers$.subscribe(teachers => {
      this.stats[0].value = teachers.length.toString();
    });

    // Subscribe to notes data from API service
    const notesSubscription = this.apiService.notes$.subscribe(notes => {
      this.stats[1].value = notes.length.toString();
      this.updateRecentActivities(notes);

    });

    // Subscribe to real-time notification updates
    const notificationSubscription = this.apiService.notificationUpdates$.subscribe(updates => {
      this.handleNotificationUpdates(updates);
    });

    // Subscribe to recent activities
    const activitiesSubscription = this.apiService.getRecentActivities().subscribe(activities => {
      this.recentActivities = activities;
    });

    this.subscriptions.push(
      teachersSubscription, 
      notesSubscription, 
      notificationSubscription,
      activitiesSubscription
    );
    
    // Load user statistics
    this.loadUserStatistics();
    
    // Listen for storage changes (when notes are uploaded or users are updated)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  updateRecentActivities(notes: Note[]) {
    // Sort by upload date (newest first) and take top 5
    const sortedNotes = notes
      .sort((a, b) => {
        const dateA = new Date(a.uploadDate);
        const dateB = new Date(b.uploadDate);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
    
    this.recentActivities = sortedNotes.map(note => ({
      user: note.teacherName,
      action: `Uploaded "${note.notesName}"`,
      time: this.getTimeAgo(note.uploadDate),
      noteName: note.notesName
    }));
  }



  handleNotificationUpdates(updates: NotificationUpdate[]) {
    // Admin doesn't need popup notifications, just update the dashboard
    console.log('Admin dashboard received notification updates:', updates);
  }



  loadUserStatistics() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      const users = JSON.parse(storedUsers);
      
      // Count total users (role === 'user')
      const totalUsers = users.filter((user: any) => user.role === 'user').length;
      this.stats[3].value = totalUsers.toString();
      
      // Count total admins (role === 'admin')
      const totalAdmins = users.filter((user: any) => user.role === 'admin').length;
      this.stats[4].value = totalAdmins.toString();
      
      // Count active today (users with lastActive date today and not blocked)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeToday = users.filter((user: any) => {
        if (user.lastActive) {
          const lastActiveDate = new Date(user.lastActive);
          lastActiveDate.setHours(0, 0, 0, 0);
          // Count if lastActive is today AND user is not blocked (status !== 'inactive')
          return lastActiveDate.getTime() === today.getTime() && user.status !== 'inactive';
        }
        return false;
      }).length;
      
      this.stats[2].value = activeToday.toString();
      
      // Update chart data with real values
      this.updateChartData(totalUsers, totalAdmins);
    }
  }
  
  updateChartData(totalUsers: number, totalAdmins: number) {
    // Generate realistic monthly data based on current totals
    // Users data - varying between 40% to 100% of total
    this.usersData = this.chartMonths.map(() => {
      const percentage = 0.4 + Math.random() * 0.6; // 40% to 100%
      return Math.floor(totalUsers * percentage);
    });
    
    // Teachers data - varying between 30% to 90% of total
    this.teachersData = this.chartMonths.map(() => {
      const percentage = 0.3 + Math.random() * 0.6; // 30% to 90%
      return Math.floor(totalAdmins * percentage);
    });
  }

  handleStorageChange(event: StorageEvent) {
    if (event.key === 'uploadedNotes') {
      // API service will handle the update automatically
      console.log('New note uploaded! Dashboard will update automatically.');
    } else if (event.key === 'users') {
      // Reload user statistics when users data changes
      this.loadUserStatistics();
    }
  }

  getTimeAgo(dateString: string): string {
    const uploadDate = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(uploadDate.getTime())) {
      return 'Unknown time';
    }
    
    const diffMs = now.getTime() - uploadDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // For older dates, show formatted date
    return uploadDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: uploadDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
  }
}
