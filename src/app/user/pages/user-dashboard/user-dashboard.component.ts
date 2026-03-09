import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../shared/services/data.service';
import { Subscription } from 'rxjs';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

interface Note {
  id: number;
  notesName: string;
  subject: string;
  teacherName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  fileData?: string;
  fileType?: string;
  // Legacy support
  teacherId?: number;
  title?: string;
  chapter?: string;
}

interface Teacher {
  id?: number;
  name: string;
  qualification: string;
  subject: string;
  email: string;
  profileImage: string;
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
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  stats = [
    { title: 'Total Notes', value: '0', icon: 'notes' },
    { title: 'AI Queries', value: '0', icon: 'ai' },
    { title: 'Storage Used', value: '0 MB', icon: 'storage' }
  ];

  recentNotes: Note[] = [];
  filteredNotes: Note[] = [];
  searchQuery: string = '';
  private notesSubscription?: Subscription;
  isLoading: boolean = true;

  // Teacher data
  teachers: Teacher[] = [];
  visibleTeachers: Teacher[] = []; // Only 4-5 teachers for dashboard
  teacherNotes: TeacherNote[] = [];
  selectedTeacher: Teacher | null = null;
  showTeacherNotesModal: boolean = false;

  constructor(
    private dataService: DataService,
    private router: Router,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadNotes();
    this.loadStats();
    this.loadTeachers();
    this.loadTeacherNotes();
    this.setupStorageListener();
  }

  ngOnDestroy() {
    if (this.notesSubscription) {
      this.notesSubscription.unsubscribe();
    }
    // Remove storage listener
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('storage', this.handleStorageChange);
    }
  }

  private setupStorageListener() {
    if (isPlatformBrowser(this.platformId)) {
      // Listen for teacher visibility changes
      window.addEventListener('storage', this.handleStorageChange);
    }
  }

  private handleStorageChange = (e: StorageEvent) => {
    console.log('Storage event received:', e.key, e.newValue);
    if (e.key === 'teacherVisibility') {
      console.log('Teacher visibility changed, reloading...');
      // Reload teachers when visibility changes
      this.loadTeachers();
      // Show notification
      this.showToast('Teacher visibility updated!', 'success');
    }
  }

  loadNotes() {
    this.isLoading = true;
    
    if (isPlatformBrowser(this.platformId)) {
      // Load from localStorage (same as upload-notes component)
      const savedNotes = localStorage.getItem('uploadedNotes');
      if (savedNotes) {
        const notes: Note[] = JSON.parse(savedNotes);
        this.recentNotes = notes.sort((a, b) => 
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
      } else {
        this.recentNotes = [];
      }
      
      this.filteredNotes = this.recentNotes;
      this.isLoading = false;
      this.updateStats();
      
      // Listen for storage changes (when notes are uploaded)
      window.addEventListener('storage', (e) => {
        if (e.key === 'uploadedNotes') {
          this.loadNotesFromStorage();
        }
      });
    } else {
      // Fallback for SSR
      this.recentNotes = [];
      this.filteredNotes = [];
      this.isLoading = false;
    }
  }

  private loadNotesFromStorage() {
    if (isPlatformBrowser(this.platformId)) {
      const savedNotes = localStorage.getItem('uploadedNotes');
      if (savedNotes) {
        const notes: Note[] = JSON.parse(savedNotes);
        this.recentNotes = notes.sort((a, b) => 
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
      } else {
        this.recentNotes = [];
      }
      this.filteredNotes = this.recentNotes;
      this.updateStats();
      this.onSearch(); // Re-apply search filter
    }
  }

  loadStats() {
    if (isPlatformBrowser(this.platformId)) {
      const aiQueries = localStorage.getItem('aiQueriesCount') || '0';
      this.stats[1].value = aiQueries;
    }
  }

  updateStats() {
    // Update total notes count
    this.stats[0].value = this.recentNotes.length.toString();

    // Calculate total storage used
    const totalBytes = this.recentNotes.reduce((sum, note) => {
      const sizeMatch = note.fileSize.match(/(\d+\.?\d*)\s*(KB|MB|GB)/i);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        
        let bytes = size;
        if (unit === 'KB') bytes *= 1024;
        else if (unit === 'MB') bytes *= 1024 * 1024;
        else if (unit === 'GB') bytes *= 1024 * 1024 * 1024;
        
        return sum + bytes;
      }
      return sum;
    }, 0);

    // Convert to appropriate unit
    if (totalBytes < 1024) {
      this.stats[2].value = `${totalBytes.toFixed(2)} B`;
    } else if (totalBytes < 1024 * 1024) {
      this.stats[2].value = `${(totalBytes / 1024).toFixed(2)} KB`;
    } else if (totalBytes < 1024 * 1024 * 1024) {
      this.stats[2].value = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      this.stats[2].value = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredNotes = this.recentNotes;
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredNotes = this.recentNotes.filter(note => 
      // Support both new and legacy note formats
      (note.notesName || note.title || '')?.toLowerCase().includes(query) ||
      (note.subject || note.chapter || '')?.toLowerCase().includes(query) ||
      note.fileName?.toLowerCase().includes(query) ||
      note.teacherName?.toLowerCase().includes(query)
    );
  }

  viewNote(note: Note) {
    if (isPlatformBrowser(this.platformId)) {
      // Store selected note in session storage
      sessionStorage.setItem('selectedNote', JSON.stringify(note));
      
      // Open note in new window or navigate
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

  downloadNote(note: Note) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (!note.fileData || !note.fileType) {
          this.showToast('File data is not available for download', 'error');
          return;
        }
        const blob = this.base64ToBlob(note.fileData, note.fileType);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = note.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Note downloaded successfully!', 'success');
      } catch (error) {
        console.error('Download error:', error);
        this.showToast('Failed to download note', 'error');
      }
    }
  }

  deleteNote(note: Note) {
    const noteName = note.notesName || note.title || 'this note';
    if (confirm(`Are you sure you want to delete "${noteName}"?`)) {
      if (isPlatformBrowser(this.platformId)) {
        const savedNotes = localStorage.getItem('uploadedNotes');
        if (savedNotes) {
          const notes: Note[] = JSON.parse(savedNotes);
          const updatedNotes = notes.filter(n => n.id !== note.id);
          localStorage.setItem('uploadedNotes', JSON.stringify(updatedNotes));
          this.loadNotesFromStorage();
          this.showToast('Note deleted successfully!', 'success');
        }
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

  // Teacher methods
  loadTeachers() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTeachers = localStorage.getItem('teachers');
      if (savedTeachers) {
        this.teachers = JSON.parse(savedTeachers);
        
        // Initialize default visibility (first time only)
        this.initializeDefaultVisibility();
        
        // Load teacher visibility settings
        const visibilitySettings = localStorage.getItem('teacherVisibility');
        let hiddenTeacherIds: number[] = [];
        
        if (visibilitySettings) {
          hiddenTeacherIds = JSON.parse(visibilitySettings);
        }
        
        console.log('📊 Total teachers:', this.teachers.length);
        console.log('🚫 Hidden teacher IDs:', hiddenTeacherIds);
        
        // Filter visible teachers (not hidden) - NO LIMIT!
        this.visibleTeachers = this.teachers
          .filter(teacher => !hiddenTeacherIds.includes(teacher.id || 0));
        
        console.log('✅ Visible teachers:', this.visibleTeachers.length);
        console.log('👥 Showing on dashboard:', this.visibleTeachers.length, '(no limit)');
      }
    }
  }

  // Initialize default visibility - show only 3-4 teachers initially
  private initializeDefaultVisibility() {
    if (isPlatformBrowser(this.platformId)) {
      const visibilitySettings = localStorage.getItem('teacherVisibility');
      const isInitialized = localStorage.getItem('teacherVisibilityInitialized');
      
      // Only initialize if not done before
      if (!isInitialized && this.teachers.length > 4) {
        console.log('🎯 First time initialization: Showing only first 4 teachers');
        
        // Hide all teachers after the first 4
        const teachersToHide = this.teachers.slice(4).map(t => t.id).filter(id => id !== undefined) as number[];
        
        localStorage.setItem('teacherVisibility', JSON.stringify(teachersToHide));
        localStorage.setItem('teacherVisibilityInitialized', 'true');
        
        console.log('✅ Initialized with 4 visible teachers, hidden:', teachersToHide);
      }
    }
  }

  loadTeacherNotes() {
    if (isPlatformBrowser(this.platformId)) {
      const savedNotes = localStorage.getItem('teacherNotes');
      if (savedNotes) {
        this.teacherNotes = JSON.parse(savedNotes);
      }
    }
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
}
