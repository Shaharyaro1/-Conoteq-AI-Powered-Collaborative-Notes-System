import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../shared/services/teachers.service';
import { AuthService } from '../../../shared/services/auth.service.new';
import { UserPreferencesService } from '../../../shared/services/user-preferences.service';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

interface Teacher {
  id?: number;
  name: string;
  qualification?: string;
  subject: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isActive?: boolean;
  isVisible?: boolean;
  createdAt?: string;
  notesCount?: number;
}

interface TeacherNote {
  id: number;
  teacherId: number;
  title: string;
  chapter: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  fileData: string;
  fileType: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  // Teacher data
  teachers: Teacher[] = [];
  visibleTeachers: Teacher[] = [];
  teacherNotes: TeacherNote[] = [];
  selectedTeacher: Teacher | null = null;
  showTeacherNotesModal: boolean = false;
  
  // Search functionality (kept for future use)
  searchQuery: string = '';
  isLoading: boolean = true;

  // New user dashboard settings - REMOVED RESTRICTIONS
  minimumTeachersToShow: number = 0; // No minimum requirement
  isNewUser: boolean = false;

  constructor(
    private teachersService: TeachersService,
    private authService: AuthService,
    private userPreferencesService: UserPreferencesService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    console.log('🚀 UserDashboard: Component initializing...');
    
    // Verify user is authenticated
    if (!this.authService.hasToken()) {
      console.warn('⚠️ No auth token found, redirecting to login');
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Clear any stale localStorage data that might be from previous user
    this.clearStaleUserData();
    
    // Load teachers data only
    this.loadTeachers();
    this.setupStorageListener();
  }
  
  // Clear stale user-specific data on component init
  private clearStaleUserData() {
    if (isPlatformBrowser(this.platformId)) {
      console.log('🧹 Checking for stale user data...');
      
      // Check if hiddenTeacherIds exists but might be from previous session
      const hiddenIds = localStorage.getItem('hiddenTeacherIds');
      if (hiddenIds) {
        console.log('📋 Found existing hiddenTeacherIds, will validate against current user');
        // Note: The actual validation happens when we load teachers
        // This is just for logging purposes
      }
    }
  }

  ngOnDestroy() {
    // Remove event listener
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('teacherVisibilityChanged', this.handleVisibilityChange as EventListener);
    }
  }

  private setupStorageListener() {
    if (isPlatformBrowser(this.platformId)) {
      // Listen for teacher visibility changes from settings page
      window.addEventListener('teacherVisibilityChanged', this.handleVisibilityChange as EventListener);
      console.log('👂 Listening for teacher visibility changes');
    }
  }

  private handleVisibilityChange = (e: CustomEvent) => {
    console.log('📢 Teacher visibility changed event received:', e.detail);
    // Reload teachers when visibility changes
    this.loadTeachers();
    // Show notification in console instead of toast
    console.log('✅ Teacher visibility updated on dashboard!');
  }

  onSearch() {
    // Search functionality placeholder - can be implemented later if needed
    console.log('Search query:', this.searchQuery);
  }

  private showToast(message: string, type: 'success' | 'error') {
    if (isPlatformBrowser(this.platformId)) {
      // Simple toast notification
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  // Teacher methods - RESPECTS HIDE/SHOW SETTINGS
  loadTeachers() {
    console.log('👥 Loading teachers from API...');
    
    // First, fetch user preferences from API to ensure we have current user's data
    this.userPreferencesService.getUserPreferences().subscribe({
      next: (preferences) => {
        console.log('✅ Loaded user preferences:', preferences);
        
        // Now load teachers with the correct hidden IDs
        this.teachersService.getTeachers(undefined, true).subscribe({
          next: (teachers) => {
            console.log('✅ Loaded all active teachers from API:', teachers.length);
            
            // Check if this is a new user (no preferences set yet)
            const isNewUser = !preferences.id || preferences.hiddenTeacherIds.length === 0;
            
            if (isNewUser && teachers.length > 3) {
              console.log('🆕 New user detected! Initializing with first 3 teachers visible...');
              
              // Hide all teachers except first 3
              const teachersToHide = teachers.slice(3).map(t => t.id!);
              console.log('🔒 Hiding teachers:', teachersToHide);
              
              // Save preferences for new user
              this.userPreferencesService.updateUserPreferences(teachersToHide).subscribe({
                next: (updatedPrefs) => {
                  console.log('✅ New user preferences saved:', updatedPrefs);
                  this.applyTeacherVisibility(teachers, updatedPrefs.hiddenTeacherIds);
                },
                error: (error) => {
                  console.error('❌ Error saving new user preferences:', error);
                  // Fallback: show all teachers
                  this.applyTeacherVisibility(teachers, []);
                }
              });
            } else {
              // Existing user or user with preferences
              const hiddenIds = preferences.hiddenTeacherIds || [];
              console.log('🔍 Hidden teacher IDs for current user:', hiddenIds);
              this.applyTeacherVisibility(teachers, hiddenIds);
            }
          },
          error: (error) => {
            console.error('❌ Error loading teachers:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading user preferences:', error);
        
        // Fallback: load teachers without filtering
        this.teachersService.getTeachers(undefined, true).subscribe({
          next: (teachers) => {
            console.log('✅ Loaded teachers (no filtering due to preferences error):', teachers.length);
            this.teachers = teachers;
            this.visibleTeachers = teachers;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('❌ Error loading teachers:', error);
            this.isLoading = false;
          }
        });
      }
    });
  }
  
  // Helper method to apply teacher visibility filtering
  private applyTeacherVisibility(teachers: Teacher[], hiddenIds: number[]) {
    // Filter out hidden teachers
    const visibleTeachers = teachers.filter(teacher => 
      !hiddenIds.includes(teacher.id || 0)
    );
    
    console.log(`🔓 Showing ${visibleTeachers.length} visible teachers out of ${teachers.length} total`);
    console.log('👥 Visible teachers:', visibleTeachers.map(t => t.name));
    
    this.teachers = teachers; // Keep all teachers for reference
    this.visibleTeachers = visibleTeachers; // Show only visible ones
    
    this.isLoading = false;
  }

  // Get hidden teacher IDs from user preferences
  private async getHiddenTeacherIds(): Promise<number[]> {
    return new Promise((resolve) => {
      // IMPORTANT: Always fetch from API first to get user-specific preferences
      // This ensures each user sees their own hidden teachers, not previous user's
      
      if (!isPlatformBrowser(this.platformId)) {
        resolve([]);
        return;
      }
      
      // Check if we have a valid auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('⚠️ No auth token found, showing all teachers');
        resolve([]);
        return;
      }
      
      // Try to get from localStorage first (for immediate response)
      const stored = localStorage.getItem('hiddenTeacherIds');
      if (stored) {
        try {
          const hiddenIds = JSON.parse(stored);
          console.log('📋 Found hidden teacher IDs in localStorage:', hiddenIds);
          resolve(hiddenIds);
          return;
        } catch (e) {
          console.warn('⚠️ Failed to parse stored hidden teacher IDs');
        }
      }
      
      // Fallback: no hidden teachers
      console.log('📋 No hidden teacher preferences found, showing all teachers');
      resolve([]);
    });
  }

  loadTeacherNotes() {
    // Teacher notes are loaded when viewing specific teacher
    // This method is kept for compatibility but doesn't need to load all notes upfront
    console.log('📝 Teacher notes will be loaded on demand');
  }

  getTeacherAvatar(teacher: Teacher): string {
    if (teacher.profileImage && 
        teacher.profileImage.trim() !== '' && 
        !teacher.profileImage.includes('placeholder') &&
        !teacher.profileImage.includes('via.placeholder') &&
        teacher.profileImage.startsWith('data:image/')) {
      return teacher.profileImage;
    }
    return this.getDefaultAvatarByGender(teacher.name);
  }

  getDefaultAvatarByGender(name: string): string {
    const femaleNames = [
      'aisha', 'fatima', 'khadija', 'zainab', 'mariam', 'ayesha', 'sara', 'hina', 'sana', 'nadia',
      'farah', 'rabia', 'samina', 'rubina', 'nasreen', 'shahida', 'bushra', 'farzana', 'shazia', 'tahira',
      'maria', 'aliya', 'sadia', 'fouzia', 'uzma', 'shama', 'razia', 'sultana', 'rashida', 'yasmeen'
    ];

    const maleNames = [
      'muhammad', 'ahmed', 'ali', 'hassan', 'hussain', 'omar', 'usman', 'ibrahim', 'yousuf', 'ismail',
      'tariq', 'khalid', 'rashid', 'salman', 'imran', 'shahid', 'naveed', 'asif', 'iqbal', 'zahid',
      'farhan', 'adnan', 'waqas', 'bilal', 'faisal', 'kamran', 'danish', 'junaid', 'hamza', 'zubair'
    ];

    const firstName = name.toLowerCase().split(' ')[0];
    
    if (femaleNames.includes(firstName)) {
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=f3e8ff&color=7c3aed&size=150&font-size=0.6&format=png&rounded=true';
    } else if (maleNames.includes(firstName)) {
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=dbeafe&color=3b82f6&size=150&font-size=0.6&format=png&rounded=true';
    } else {
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=f3f4f6&color=6b7280&size=150&font-size=0.6&format=png&rounded=true';
    }
  }

  onImageError(event: any, teacher: Teacher) {
    event.target.src = this.getDefaultAvatarByGender(teacher.name);
  }

  viewTeacherNotes(teacher: Teacher) {
    // Navigate to teacher notes page
    this.router.navigate(['/user/teacher-notes', teacher.id]);
  }

  closeTeacherNotesModal() {
    this.showTeacherNotesModal = false;
    this.selectedTeacher = null;
  }

  getTeacherNotesForSelected(): TeacherNote[] {
    if (!this.selectedTeacher?.id) return [];
    return this.teacherNotes.filter(note => note.teacherId === this.selectedTeacher!.id);
  }

  viewTeacherNote(note: TeacherNote) {
    if (isPlatformBrowser(this.platformId)) {
      if (note.fileType === 'application/pdf') {
        if (!note.fileData || !note.fileType) {
          this.showToast('File data is not available for viewing', 'error');
          return;
        }
        const blob = this.base64ToBlob(note.fileData, note.fileType);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert('Note viewer coming soon!');
      }
    }
  }

  downloadTeacherNote(note: TeacherNote) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (!note.fileData) {
          this.showToast('File data is not available for download', 'error');
          return;
        }
        const link = document.createElement('a');
        link.href = note.fileData;
        link.download = note.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Note downloaded successfully!', 'success');
      } catch (error) {
        console.error('Download error:', error);
        this.showToast('Failed to download note', 'error');
      }
    }
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }
}