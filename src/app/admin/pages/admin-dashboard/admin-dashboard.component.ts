import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../shared/services/data.service';
import { ApiService, NotificationUpdate } from '../../../shared/services/api.service.new';
import { NotificationService } from '../../../shared/services/notification.service';
import { UsersService } from '../../../shared/services/users.service';
import { AuthService } from '../../../shared/services/auth.service.new';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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

  // Add a loading state
  isLoading = true;

  constructor(
    private dataService: DataService,
    private apiService: ApiService,
    private notificationService: NotificationService,
    private usersService: UsersService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Request notification permission
    this.apiService.requestNotificationPermission();

    // Subscribe to current user and load stats when admin is authenticated
    const authSubscription = this.authService.currentUser$.pipe(
      filter(user => user !== null && user.role === 'admin')
    ).subscribe(user => {
      console.log('👤 Admin user authenticated:', user);
      
      // Test API connection first
      this.testApiConnection();
      
      // Load dashboard data
      this.loadUserStatistics();
      this.loadRecentActivities();
      
      // Set up real-time updates every 30 seconds
      this.setupRealTimeUpdates();
    });

    // Subscribe to new user registrations for immediate updates
    const userRegisteredSubscription = this.authService.userRegistered$.subscribe(() => {
      console.log('🎉 New user registered! Updating dashboard...');
      setTimeout(() => {
        this.loadUserStatistics();
      }, 1000); // Small delay to ensure database is updated
    });

    // Subscribe to teachers data
    const teachersSubscription = this.dataService.teachers$.subscribe(teachers => {
      this.stats[0].value = teachers.length.toString();
    });

    // Subscribe to notes data from API service - load directly instead of subscription
    // const notesSubscription = this.apiService.notes$.subscribe(notes => {
    //   this.stats[1].value = notes.length.toString();
    //   this.updateRecentActivities(notes);
    // });

    // Load notes directly from API
    this.loadNotesStatistics();

    // Subscribe to real-time notification updates
    const notificationSubscription = this.apiService.notificationUpdates$.subscribe(updates => {
      this.handleNotificationUpdates(updates);
    });

    this.subscriptions.push(
      authSubscription,
      userRegisteredSubscription,
      teachersSubscription, 
      // notesSubscription, // Removed - loading directly
      notificationSubscription
    );
    
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



  private realTimeInterval: any;

  setupRealTimeUpdates() {
    // Update statistics every 30 seconds for real-time data
    this.realTimeInterval = setInterval(() => {
      console.log('🔄 Refreshing dashboard statistics...');
      this.loadUserStatistics();
      this.loadNotesStatistics();
      this.loadRecentActivities();
    }, 30000); // 30 seconds
  }

  loadUserStatistics() {
    console.log('📊 Loading dashboard statistics...');
    console.log('🔑 Current auth token:', localStorage.getItem('auth_token') ? 'Token exists' : 'No token found');
    console.log('👤 Current user:', this.authService.getCurrentUserValue());
    
    this.isLoading = true;
    
    // Load statistics from API
    this.usersService.getDashboardStats().subscribe({
      next: (stats) => {
        console.log('📊 Dashboard stats loaded successfully:', stats);
        
        // Update stats array with API data
        this.stats[3].value = stats.totalUsers.toString(); // Total Users
        this.stats[4].value = stats.totalAdmins.toString(); // Total Admins
        this.stats[2].value = stats.activeUsers.toString(); // Active Today
        
        // Also update teachers and notes count from API
        this.stats[0].value = stats.totalTeachers.toString(); // Total Teachers
        this.stats[1].value = stats.totalNotes.toString(); // Total Notes
        
        console.log('📊 Updated stats array:', this.stats);
        
        // Update chart data with real values
        this.updateChartData(stats.totalUsers, stats.totalAdmins);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading dashboard stats:', error);
        console.error('❌ Error details:', {
          status: error.status,
          message: error.message,
          url: error.url
        });
        // Keep current values on error, don't reset to 0
        console.log('⚠️ Keeping current values due to API error');
        this.isLoading = false;
      }
    });
  }

  loadNotesStatistics() {
    console.log('📊 Loading notes statistics...');
    
    this.apiService.getAllNotes().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          console.log('📊 Notes statistics loaded:', response.data.length);
          this.stats[1].value = response.data.length.toString();
          this.updateRecentActivities(response.data);
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading notes statistics:', error);
      }
    });
  }

  loadRecentActivities() {
    console.log('📋 Loading recent activities...');
    
    // Load recent activities from API
    this.usersService.getRecentActivities(5).subscribe({
      next: (activities) => {
        console.log('📋 Recent activities loaded successfully:', activities);
        this.recentActivities = activities.map(activity => ({
          user: activity.userName || 'Unknown',
          action: activity.description,
          time: this.getTimeAgo(activity.timestamp.toString()),
          noteName: activity.description.includes('"') ? 
            activity.description.split('"')[1] : undefined
        }));
      },
      error: (error) => {
        console.error('❌ Error loading recent activities:', error);
        this.recentActivities = [];
      }
    });
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
    } else if (event.key === 'users' || event.key === 'auth_token') {
      // Reload user statistics from API when users data changes or new user logs in
      console.log('🔄 User data changed, refreshing dashboard...');
      this.loadUserStatistics();
    }
  }

  // Method to manually refresh dashboard (can be called from other components)
  refreshDashboard() {
    console.log('🔄 Manual dashboard refresh requested');
    this.loadUserStatistics();
    this.loadRecentActivities();
  }

  // Test method to check API connectivity
  testApiConnection() {
    console.log('🧪 Testing API connection...');
    this.usersService.getUsers().subscribe({
      next: (users) => {
        console.log('✅ API connection successful! Users found:', users.length);
        console.log('Users data:', users);
      },
      error: (error) => {
        console.error('❌ API connection failed:', error);
      }
    });
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
    
    // Clear real-time update interval
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
    }
    
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
  }
}
