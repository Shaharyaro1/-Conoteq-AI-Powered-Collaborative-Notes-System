import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherFormComponent } from './teacher-form/teacher-form.component';
import { ToastService } from '../../../shared/services/toast.service';
import { DataService } from '../../../shared/services/data.service';
import { TeachersService, Teacher } from '../../../shared/services/teachers.service';
import { TeacherNotesService } from '../../../shared/services/teacher-notes.service';
import { environment } from '../../../../environments/environment';

// Angular Material Imports
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';

// Local interface for form data
interface TeacherFormData {
  id?: number;
  name: string;
  qualification?: string;
  subject: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isActive?: boolean;
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
  selector: 'app-teacher',
  standalone: true,
  imports: [CommonModule, FormsModule, TeacherFormComponent, MatPaginatorModule, MatTableModule],
  templateUrl: './teacher.component.html',
  styleUrls: ['./teacher.component.css']
})
export class TeacherComponent implements OnInit, AfterViewInit {
  teachers: Teacher[] = [];
  showForm: boolean = false;
  isEditMode: boolean = false;
  selectedTeacher: Teacher | null = null;

  // Debug properties
  debugInfo: string = '';
  isLoading: boolean = false;
  showDropdown: boolean = false;

  // Search functionality
  searchTerm: string = '';
  filteredTeachers: Teacher[] = [];
  
  // Material Paginator
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource: MatTableDataSource<Teacher>;
  
  // Pagination for display
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;
  pageSizeOptions: number[] = [5, 10, 15, 20, 50];

  // Notes functionality
  showNotesModal: boolean = false;
  teacherNotes: TeacherNote[] = [];
  selectedNotesFile: File | null = null;
  newNote = {
    title: '',
    chapter: ''
  };

  // Make Math available in template
  Math = Math;

  // Convert service Teacher to form Teacher
  get formTeacherData(): TeacherFormData | null {
    if (!this.selectedTeacher) return null;
    return {
      id: this.selectedTeacher.id,
      name: this.selectedTeacher.name,
      qualification: this.selectedTeacher.qualification,
      subject: this.selectedTeacher.subject,
      email: this.selectedTeacher.email,
      profileImage: this.selectedTeacher.profileImage,
      isActive: this.selectedTeacher.isActive
    };
  }

  constructor(
    private toastService: ToastService,
    private dataService: DataService,
    private teachersService: TeachersService,
    private teacherNotesService: TeacherNotesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.dataSource = new MatTableDataSource<Teacher>([]);
  }

  ngAfterViewInit() {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      console.log('✅ Paginator initialized in ngAfterViewInit');
    }
  }

  ngOnInit() {
    console.log('TeacherComponent ngOnInit started');
    
    // AGGRESSIVE localStorage clearing - remove ALL teacher data
    this.aggressiveClearAllTeacherData();
    
    // Check authentication status
    this.checkAuthStatus();
    
    // Load teachers from API instead of localStorage
    this.loadTeachersFromAPI();
    this.loadTeacherNotesFromAPI();
  }

  aggressiveClearAllTeacherData() {
    if (isPlatformBrowser(this.platformId)) {
      console.log('🔥 AGGRESSIVE CLEAR: Removing ALL teacher-related data...');
      
      // Clear specific known keys
      const allPossibleKeys = [
        'teachers', 'teacherData', 'teachersData', 'teacher_data',
        'teacherNotes', 'teacher_notes', 'teacherNotesData',
        'teacherVisibility', 'teacher_visibility', 'teacherVisibilityInitialized',
        'sampleTeachers', 'sample_teachers', 'sampleTeachersAdded',
        'defaultTeachers', 'default_teachers', 'initialTeachers',
        'cachedTeachers', 'cached_teachers', 'storedTeachers',
        'uploadedNotes', 'uploaded_notes', 'recentNotes', 'recent_notes',
        'sampleDataCleared', 'sample_data_cleared', 'dataInitialized'
      ];
      
      allPossibleKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed: ${key}`);
        }
      });
      
      // Scan ALL localStorage keys for anything teacher-related
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }
      
      allKeys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if ((lowerKey.includes('teacher') || lowerKey.includes('note') || lowerKey.includes('sample')) && 
            key !== 'auth_token' && key !== 'currentUser') {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed suspicious key: ${key}`);
        }
      });
      
      console.log('🔥 AGGRESSIVE CLEAR COMPLETE - localStorage now contains only:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`  - ${key}`);
      }
    }
  }

  checkAuthStatus() {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Skip localStorage access during SSR
    }
    
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('currentUser');
    console.log('🔐 Auth Status Check:');
    console.log('  - Token exists:', !!token);
    console.log('  - Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
    console.log('  - User data:', user ? JSON.parse(user) : 'No user data');
    
    this.debugInfo = `Auth Check: Token ${token ? 'EXISTS' : 'MISSING'}, User: ${user ? JSON.parse(user).username : 'None'}`;
    
    if (!token) {
      console.error('❌ No authentication token found!');
      this.debugInfo += ' - ERROR: No auth token!';
      this.toastService.error('Please log in to access teacher management');
      return;
    }
  }

  refreshData() {
    console.log('🔄 Refreshing teacher data...');
    this.loadTeachersFromAPI();
    this.loadTeacherNotesFromAPI();
  }

  testApiCall() {
    console.log('🧪 Testing API call manually...');
    if (!isPlatformBrowser(this.platformId)) {
      console.log('❌ Cannot test API call during SSR');
      return;
    }
    
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Current token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      this.toastService.error('No authentication token found. Please log in again.');
      return;
    }
    
    this.teachersService.getTeachers().subscribe({
      next: (teachers) => {
        console.log('✅ Manual API test successful:', teachers);
        this.toastService.success(`API test successful! Found ${teachers.length} teachers`);
        this.teachers = teachers;
        this.filteredTeachers = [...this.teachers];
        this.totalItems = this.filteredTeachers.length;
        this.dataSource.data = this.filteredTeachers;
      },
      error: (error) => {
        console.error('❌ Manual API test failed:', error);
        this.toastService.error(`API test failed: ${error.message}`);
      }
    });
  }

  clearAllLocalStorageData() {
    console.log('🧹 Clearing ALL localStorage data (except auth)...');
    if (isPlatformBrowser(this.platformId)) {
      const authToken = localStorage.getItem('auth_token');
      const currentUser = localStorage.getItem('currentUser');
      
      // Clear everything
      localStorage.clear();
      
      // Restore auth data
      if (authToken) localStorage.setItem('auth_token', authToken);
      if (currentUser) localStorage.setItem('currentUser', currentUser);
      
      console.log('✅ All localStorage cleared except auth data');
      this.toastService.success('All cached data cleared. Refreshing from API...');
      
      // Reload data from API
      this.loadTeachersFromAPI();
    }
  }

  forceApiOnlyMode() {
    console.log('🚀 FORCE API ONLY MODE - Clearing all cached data...');
    
    if (isPlatformBrowser(this.platformId)) {
      // Save auth data
      const authToken = localStorage.getItem('auth_token');
      const currentUser = localStorage.getItem('currentUser');
      
      // Clear everything
      localStorage.clear();
      
      // Restore auth
      if (authToken) localStorage.setItem('auth_token', authToken);
      if (currentUser) localStorage.setItem('currentUser', currentUser);
      
      // Reset component state
      this.teachers = [];
      this.filteredTeachers = [];
      this.totalItems = 0;
      this.dataSource.data = [];
      
      // Force reload from API
      this.debugInfo = 'Forced API-only mode - loading fresh data...';
      this.loadTeachersFromAPI();
      
      this.toastService.success('Forced API-only mode activated! All data now comes from database.');
    }
  }

  nuclearReset() {
    console.log('💥 NUCLEAR RESET - Complete component reset...');
    
    if (isPlatformBrowser(this.platformId)) {
      // Save auth data
      const authToken = localStorage.getItem('auth_token');
      const currentUser = localStorage.getItem('currentUser');
      
      // COMPLETE localStorage clear
      localStorage.clear();
      
      // Restore auth
      if (authToken) localStorage.setItem('auth_token', authToken);
      if (currentUser) localStorage.setItem('currentUser', currentUser);
      
      // COMPLETE component reset
      this.teachers = [];
      this.filteredTeachers = [];
      this.totalItems = 0;
      this.pageIndex = 0;
      this.pageSize = 10;
      this.searchTerm = '';
      this.dataSource = new MatTableDataSource<Teacher>([]);
      this.showForm = false;
      this.isEditMode = false;
      this.selectedTeacher = null;
      
      // Force aggressive clear and reload
      this.aggressiveClearAllTeacherData();
      
      this.debugInfo = 'NUCLEAR RESET COMPLETE - Reloading from API...';
      this.isLoading = true;
      
      // Delay to ensure everything is cleared
      setTimeout(() => {
        this.loadTeachersFromAPI();
      }, 500);
      
      this.toastService.success('NUCLEAR RESET complete! Component fully reinitialized with API data only.');
    }
  }

  loadTeachersFromAPI() {
      console.log('👥 Loading teachers from API...');
      if (isPlatformBrowser(this.platformId)) {
        console.log('🔑 Auth token exists:', !!localStorage.getItem('auth_token'));
      }
      
      // Check current component state before API call
      console.log('📊 Current component state BEFORE API call:');
      console.log('  - teachers array length:', this.teachers.length);
      console.log('  - filteredTeachers length:', this.filteredTeachers.length);
      console.log('  - dataSource data length:', this.dataSource.data.length);
      
      this.isLoading = true;
      this.debugInfo = 'Starting API call...';
      
      this.teachersService.getTeachers().subscribe({
        next: (teachers) => {
          console.log('✅ Teachers loaded from API:', teachers.length);
          console.log('📋 API Teachers data:', teachers);
          
          // Set new data from API
          this.teachers = teachers;
          this.filteredTeachers = [...this.teachers];
          this.totalItems = this.filteredTeachers.length;
          
          // CRITICAL: Update dataSource.data and trigger change detection
          this.dataSource.data = [...this.filteredTeachers];
          
          // Re-attach paginator if it exists
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
            console.log('✅ Paginator re-attached after data load');
          }
          
          this.isLoading = false;
          this.debugInfo = `Successfully loaded ${teachers.length} teachers from API. Names: ${teachers.map(t => t.name).join(', ')}`;

          console.log('📊 Component state AFTER API call:');
          console.log('  - teachers array:', this.teachers.map(t => t.name));
          console.log('  - filteredTeachers:', this.filteredTeachers.map(t => t.name));
          console.log('  - dataSource data:', this.dataSource.data.map(t => t.name));
          console.log('  - dataSource.data.length:', this.dataSource.data.length);

          // Initialize the data service with current data
          this.dataService.updateTeachers(this.teachers);
        },
        error: (error) => {
          console.error('Failed to load teachers from API:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error message:', error.message);
          console.error('❌ Full error:', error);
          
          // FORCE CLEAR on error
          this.teachers = [];
          this.filteredTeachers = [];
          this.totalItems = 0;
          this.dataSource.data = [];
          
          this.isLoading = false;
          this.debugInfo = `API Error: ${error.status} - ${error.message}. Token exists: ${isPlatformBrowser(this.platformId) ? !!localStorage.getItem('auth_token') : 'SSR'}`;
          this.toastService.error('Failed to load teachers from server: ' + error.message);
        }
      });
    }

  loadTeacherNotesFromAPI() {
    console.log('📝 Loading teacher notes from API...');
    // For now, initialize empty array - will be loaded per teacher when needed
    this.teacherNotes = [];
    this.dataService.updateNotes(this.teacherNotes);
  }



  onFormSubmit(teacher: TeacherFormData) {
    console.log('📝 Form submitted with teacher data:', teacher);
    
    if (this.isEditMode && this.selectedTeacher) {
      // Update existing teacher via API
      this.teachersService.updateTeacher(this.selectedTeacher.id!, {
        name: teacher.name,
        qualification: teacher.qualification,
        subject: teacher.subject,
        email: teacher.email,
        profileImage: teacher.profileImage,
        isActive: teacher.isActive
      }).subscribe({
        next: (updatedTeacher) => {
          console.log('✏️ Teacher updated via API:', updatedTeacher);
          this.toastService.success(`Teacher "${teacher.name}" updated successfully!`);
          this.loadTeachersFromAPI(); // Refresh list
          this.closeFormModal();
        },
        error: (error) => {
          console.error('❌ Failed to update teacher:', error);
          this.toastService.error('Failed to update teacher');
        }
      });
    } else {
      // Add new teacher via API
      this.teachersService.createTeacher({
        name: teacher.name,
        qualification: teacher.qualification,
        subject: teacher.subject,
        email: teacher.email,
        profileImage: teacher.profileImage,
        isActive: teacher.isActive ?? true
      }).subscribe({
        next: (newTeacher) => {
          console.log('➕ Teacher added via API:', newTeacher);
          this.toastService.success(`Teacher "${teacher.name}" added successfully!`);
          this.loadTeachersFromAPI(); // Refresh list
          this.closeFormModal();
        },
        error: (error) => {
          console.error('❌ Failed to add teacher:', error);
          this.toastService.error('Failed to add teacher');
        }
      });
    }
  }

  editTeacher(teacher: Teacher) {
    this.selectedTeacher = teacher;
    this.isEditMode = true;
    this.showForm = true;
  }

  deleteTeacher(teacher: Teacher) {
    if (confirm(`Are you sure you want to delete ${teacher.name}?`)) {
      this.teachersService.deleteTeacher(teacher.id!).subscribe({
        next: () => {
          console.log('🗑️ Teacher deleted via API:', teacher.name);
          this.toastService.info(`Teacher "${teacher.name}" deleted successfully.`);
          this.loadTeachersFromAPI(); // Refresh list
        },
        error: (error) => {
          console.error('❌ Failed to delete teacher:', error);
          this.toastService.error('Failed to delete teacher');
        }
      });
    }
  }

  // Toggle teacher visibility
  toggleTeacherVisibility(teacher: Teacher) {
    console.log('🔄 Toggling teacher visibility for:', teacher.name);
    console.log('📊 Current status:', teacher.isActive ? 'Active' : 'Hidden');
    
    const newVisibility = !teacher.isActive;
    console.log('🎯 New status will be:', newVisibility ? 'Active' : 'Hidden');
    
    this.teachersService.updateTeacher(teacher.id!, {
      isActive: newVisibility
    }).subscribe({
      next: (updatedTeacher) => {
        console.log('✅ Teacher visibility updated via API:', updatedTeacher);
        console.log('📋 Updated teacher status:', updatedTeacher.isActive ? 'Active' : 'Hidden');
        
        const status = newVisibility ? 'active' : 'hidden';
        this.toastService.success(`Teacher "${teacher.name}" is now ${status}.`);
        this.loadTeachersFromAPI(); // Refresh list
      },
      error: (error) => {
        console.error('❌ Failed to update teacher visibility:', error);
        console.error('🔍 Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.toastService.error('Failed to update teacher visibility: ' + error.message);
      }
    });
  }

  openAddForm() {
    console.log('Opening add teacher form');
    this.showForm = true;
    this.isEditMode = false;
    this.selectedTeacher = null;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  closeFormModal() {
    this.showForm = false;
    this.isEditMode = false;
    this.selectedTeacher = null;
  }

  // Search methods
  onSearch() {
    this.updateFilteredTeachers();
  }

  clearSearch() {
    this.searchTerm = '';
    this.updateFilteredTeachers();
  }

  updateFilteredTeachers() {
    console.log('Updating filtered teachers. Total teachers:', this.teachers.length);
    if (!this.searchTerm.trim()) {
      this.filteredTeachers = [...this.teachers];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredTeachers = this.teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(searchLower) ||
        teacher.subject.toLowerCase().includes(searchLower) ||
        teacher.email.toLowerCase().includes(searchLower)
      );
    }
    this.totalItems = this.filteredTeachers.length;
    this.pageIndex = 0; // Reset to first page when filtering
    
    // CRITICAL: Update dataSource with new filtered data
    this.dataSource.data = [...this.filteredTeachers];
    
    console.log('Filtered teachers:', this.filteredTeachers.length);
    console.log('DataSource updated with:', this.dataSource.data.length, 'teachers');
  }

  // Pagination methods
  get paginatedTeachers(): Teacher[] {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredTeachers.slice(startIndex, endIndex);
  }

  // Material Paginator event handler
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.totalItems = this.filteredTeachers.length;
  }





  viewTeacherNotes(teacher: Teacher) {
    this.selectedTeacher = teacher;
    this.showNotesModal = true;
  }

  closeNotesModal() {
    this.showNotesModal = false;
    this.selectedTeacher = null;
    this.resetNotesForm();
  }

  onNotesFileSelected(event: any) {
    this.selectedNotesFile = event.target.files[0];
  }

  uploadTeacherNotes() {
    console.log('=== Teacher Notes Upload Started ===');
    
    if (!this.selectedNotesFile || !this.newNote.title || !this.selectedTeacher?.id) {
      console.error('❌ Validation Failed - Missing required fields');
      this.toastService.error('Please fill all required fields and select a file.');
      return;
    }

    console.log('✅ Validation Passed');
    console.log('File:', this.selectedNotesFile.name);
    console.log('Title:', this.newNote.title);
    console.log('Chapter:', this.newNote.chapter);
    console.log('Teacher ID:', this.selectedTeacher.id);

    const createTeacherNoteDto = {
      title: this.newNote.title,
      content: this.newNote.chapter || '',
      subject: this.selectedTeacher.subject,
      teacherId: this.selectedTeacher.id,
      file: this.selectedNotesFile
    };

    console.log('📤 Sending to API:', {
      title: createTeacherNoteDto.title,
      content: createTeacherNoteDto.content,
      subject: createTeacherNoteDto.subject,
      teacherId: createTeacherNoteDto.teacherId,
      fileName: this.selectedNotesFile.name
    });

    // Use the new API service
    this.teacherNotesService.createTeacherNote(createTeacherNoteDto).subscribe({
      next: (response) => {
        console.log('✅ Teacher Notes Uploaded Successfully!');
        console.log('API Response:', response);
        
        // Add to local array for immediate UI update
        const teacherNote: TeacherNote = {
          id: response.id,
          teacherId: response.teacherId,
          title: response.title,
          chapter: response.content,
          fileName: this.selectedNotesFile!.name,
          fileSize: (this.selectedNotesFile!.size / (1024 * 1024)).toFixed(2) + ' MB',
          uploadDate: new Date().toLocaleDateString('en-CA'),
          fileType: this.selectedNotesFile!.type,
          fileData: '' // Empty since file is stored on server
        };

        this.teacherNotes.unshift(teacherNote);
        this.toastService.success(`Notes "${teacherNote.title}" uploaded successfully!`);
        console.log('Success Message:', `Notes "${teacherNote.title}" uploaded successfully!`);
        this.resetNotesForm();
      },
      error: (error) => {
        console.error('❌ Teacher Notes Upload Failed!');
        console.error('API Error:', error);
        console.error('Error Status:', error.status);
        console.error('Error Message:', error.message);
        this.toastService.error(error.message || 'Failed to upload notes. Please try again.');
      }
    });
  }

  getTeacherNotes(): TeacherNote[] {
    if (!this.selectedTeacher?.id) return [];
    return this.teacherNotes.filter(note => note.teacherId === this.selectedTeacher!.id);
  }

  downloadTeacherNote(note: TeacherNote) {
    if (!note.fileData) {
      this.toastService.error('File data not available for download.');
      return;
    }

    const link = document.createElement('a');
    link.href = note.fileData;
    link.download = note.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toastService.success(`Notes "${note.title}" downloaded successfully!`);
  }

  viewTeacherNote(note: TeacherNote) {
    if (!note.fileData) {
      this.toastService.error('File data not available for viewing.');
      return;
    }

    // Open the file in a new window/tab for viewing
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${note.title} - ${note.fileName}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%);
              min-height: 100vh;
            }
            .header {
              background: linear-gradient(135deg, #7c3aed 0%, #10b981 100%);
              color: white;
              padding: 1rem 2rem;
              border-radius: 12px;
              margin-bottom: 2rem;
              box-shadow: 0 4px 15px rgba(124, 58, 237, 0.25);
              position: relative;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .header-content {
              flex: 1;
            }
            .header h1 {
              margin: 0;
              font-size: 1.5rem;
            }
            .header p {
              margin: 0.5rem 0 0 0;
              opacity: 0.9;
            }
            .close-btn {
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              color: white;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.3s ease;
              backdrop-filter: blur(10px);
              font-size: 18px;
              font-weight: bold;
              margin-left: 1rem;
            }
            .close-btn:hover {
              background: rgba(255, 255, 255, 0.3);
              border-color: rgba(255, 255, 255, 0.5);
              transform: scale(1.1);
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }
            .close-btn:active {
              transform: scale(0.95);
            }
            
            /* Additional animations and effects */
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .header {
              animation: fadeIn 0.3s ease-out;
            }
            
            .content {
              animation: fadeIn 0.4s ease-out 0.1s both;
            }
            
            .close-btn {
              animation: fadeIn 0.5s ease-out 0.2s both;
            }
            
            /* Pulse effect for close button */
            @keyframes pulse {
              0% {
                box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
              }
              70% {
                box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
              }
            }
            
            .close-btn:focus {
              animation: pulse 1.5s infinite;
              outline: none;
            }
            
            /* Tooltip for close button */
            .close-btn::after {
              content: 'Press ESC or click to close';
              position: absolute;
              bottom: -35px;
              right: 0;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 0.5rem;
              border-radius: 4px;
              font-size: 0.75rem;
              white-space: nowrap;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.3s ease;
            }
            
            .close-btn:hover::after {
              opacity: 1;
            }
            
            /* Enhanced PDF and File Viewer Styles */
            .pdf-viewer-container, .image-viewer-container, .document-viewer, .presentation-viewer, .text-viewer {
              width: 100%;
            }
            
            .pdf-controls, .image-controls, .text-controls {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 1rem;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 8px;
              margin-bottom: 1rem;
              border: 1px solid #e2e8f0;
            }
            
            .control-btn {
              background: linear-gradient(135deg, #7c3aed 0%, #10b981 100%);
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.875rem;
              font-weight: 500;
              transition: all 0.2s ease;
              margin-right: 0.5rem;
            }
            
            .control-btn:hover {
              background: linear-gradient(135deg, #6d28d9 0%, #059669 100%);
              transform: translateY(-1px);
              box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
            }
            
            .pdf-info, .image-info, .text-info {
              color: #6b7280;
              font-size: 0.875rem;
              font-weight: 500;
            }
            
            .pdf-embed-container {
              position: relative;
              background: #f8fafc;
              border-radius: 8px;
              overflow: hidden;
            }
            
            .pdf-error {
              text-align: center;
              padding: 3rem;
              color: #6b7280;
            }
            
            .pdf-error h3 {
              margin-bottom: 1rem;
              color: #374151;
            }
            
            .doc-info, .ppt-info {
              text-align: center;
              padding: 2rem;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 8px;
              margin-bottom: 1rem;
              border: 1px solid #e2e8f0;
            }
            
            .doc-actions, .ppt-actions {
              text-align: center;
              padding: 1rem;
            }
            
            .image-container {
              background: #f8fafc;
              border-radius: 8px;
              padding: 1rem;
              border: 1px solid #e2e8f0;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
              .pdf-controls, .image-controls {
                flex-direction: column;
                gap: 0.5rem;
                text-align: center;
              }
              
              .control-btn {
                margin: 0.25rem;
              }
              
              iframe, embed, object {
                height: 70vh !important;
              }
            }
            .content {
              background: white;
              border-radius: 12px;
              padding: 2rem;
              box-shadow: 0 8px 25px rgba(124, 58, 237, 0.12);
              border: 1px solid rgba(124, 58, 237, 0.1);
            }
            iframe, embed, object {
              width: 100%;
              height: 80vh;
              border: none;
              border-radius: 8px;
            }
            .file-info {
              display: flex;
              align-items: center;
              gap: 1rem;
              margin-bottom: 1rem;
              padding: 1rem;
              background: linear-gradient(135deg, #f3e8ff 0%, #ddd6fe 100%);
              border-radius: 8px;
              border: 1px solid rgba(124, 58, 237, 0.2);
            }
            .download-btn {
              background: linear-gradient(135deg, #7c3aed 0%, #10b981 100%);
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.2s ease;
            }
            .download-btn:hover {
              background: linear-gradient(135deg, #6d28d9 0%, #059669 100%);
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <h1>${note.title}</h1>
              <p>Chapter: ${note.chapter || 'N/A'} | File: ${note.fileName} | Size: ${note.fileSize}</p>
            </div>
            <button class="close-btn" onclick="closeViewer()" title="Close Viewer">
              ✕
            </button>
          </div>
          <div class="content">
            <div class="file-info">
              <span><strong>Upload Date:</strong> ${note.uploadDate}</span>
              <button class="download-btn" onclick="downloadFile()">
                📥 Download File
              </button>
            </div>
            ${this.getFileViewer(note)}
          </div>
          <script>
            function downloadFile() {
              const link = document.createElement('a');
              link.href = '${note.fileData}';
              link.download = '${note.fileName}';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
            
            function closeViewer() {
              if (confirm('Are you sure you want to close the viewer?')) {
                window.close();
              }
            }
            
            // Add keyboard shortcut for closing (Escape key)
            document.addEventListener('keydown', function(event) {
              if (event.key === 'Escape') {
                closeViewer();
              }
            });
            
            // Add visual feedback for close button
            document.addEventListener('DOMContentLoaded', function() {
              const closeBtn = document.querySelector('.close-btn');
              if (closeBtn) {
                closeBtn.addEventListener('mouseenter', function() {
                  this.innerHTML = '✕';
                  this.style.transform = 'scale(1.1) rotate(90deg)';
                });
                closeBtn.addEventListener('mouseleave', function() {
                  this.innerHTML = '✕';
                  this.style.transform = 'scale(1) rotate(0deg)';
                });
              }
            });
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
      this.toastService.success(`Notes "${note.title}" opened for viewing!`);
    } else {
      this.toastService.error('Unable to open viewer. Please check your popup blocker settings.');
    }
  }

  private getFileViewer(note: TeacherNote): string {
    const fileExtension = note.fileName.split('.').pop()?.toLowerCase();
    
    switch (fileExtension) {
      case 'pdf':
        return `
          <div class="pdf-viewer-container">
            <div class="pdf-controls">
              <button onclick="openInNewTab()" class="control-btn">
                🔗 Open in New Tab
              </button>
              <button onclick="toggleFullscreen()" class="control-btn">
                ⛶ Fullscreen
              </button>
              <span class="pdf-info">📄 PDF Document | ${note.fileSize}</span>
            </div>
            
            <!-- Primary PDF Viewer (Embed) -->
            <div class="pdf-embed-container">
              <embed 
                id="pdfEmbed"
                src="${note.fileData}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH" 
                type="application/pdf"
                style="width: 100%; height: 85vh; border: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
              />
            </div>
            
            <!-- Fallback PDF Viewer (Object) -->
            <div class="pdf-fallback" style="display: none;">
              <object 
                data="${note.fileData}#toolbar=1&navpanes=1&scrollbar=1" 
                type="application/pdf" 
                style="width: 100%; height: 85vh; border: none; border-radius: 8px;"
              >
                <div class="pdf-error">
                  <h3>📄 PDF Viewer</h3>
                  <p>Your browser doesn't support embedded PDFs.</p>
                  <button onclick="downloadFile()" class="download-btn">
                    📥 Download PDF to View
                  </button>
                  <button onclick="openInNewTab()" class="download-btn" style="margin-left: 1rem;">
                    🔗 Open in New Tab
                  </button>
                </div>
              </object>
            </div>
            
            <script>
              // Enhanced PDF viewing functions
              function openInNewTab() {
                const newTab = window.open('${note.fileData}', '_blank');
                if (!newTab) {
                  alert('Please allow popups to open PDF in new tab');
                }
              }
              
              function toggleFullscreen() {
                const embed = document.getElementById('pdfEmbed');
                if (embed) {
                  if (!document.fullscreenElement) {
                    embed.requestFullscreen().catch(err => {
                      console.log('Fullscreen error:', err);
                    });
                  } else {
                    document.exitFullscreen();
                  }
                }
              }
              
              // Check if PDF loaded successfully
              setTimeout(() => {
                const embed = document.getElementById('pdfEmbed');
                const fallback = document.querySelector('.pdf-fallback');
                
                if (embed && fallback) {
                  embed.onerror = function() {
                    embed.style.display = 'none';
                    fallback.style.display = 'block';
                  };
                }
              }, 1000);
            </script>
          </div>
        `;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'bmp':
        return `
          <div class="image-viewer-container">
            <div class="image-controls">
              <button onclick="zoomIn()" class="control-btn">🔍+ Zoom In</button>
              <button onclick="zoomOut()" class="control-btn">🔍- Zoom Out</button>
              <button onclick="resetZoom()" class="control-btn">↻ Reset</button>
              <span class="image-info">🖼️ Image | ${note.fileSize}</span>
            </div>
            <div class="image-container" style="text-align: center; overflow: auto; max-height: 80vh;">
              <img 
                id="viewerImage"
                src="${note.fileData}" 
                style="max-width: 100%; height: auto; border-radius: 8px; transition: transform 0.3s ease; cursor: zoom-in;" 
                alt="${note.title}"
                onclick="toggleImageZoom(this)"
              />
            </div>
            <script>
              let currentZoom = 1;
              
              function zoomIn() {
                currentZoom += 0.2;
                updateImageZoom();
              }
              
              function zoomOut() {
                currentZoom = Math.max(0.2, currentZoom - 0.2);
                updateImageZoom();
              }
              
              function resetZoom() {
                currentZoom = 1;
                updateImageZoom();
              }
              
              function updateImageZoom() {
                const img = document.getElementById('viewerImage');
                if (img) {
                  img.style.transform = 'scale(' + currentZoom + ')';
                }
              }
              
              function toggleImageZoom(img) {
                if (currentZoom === 1) {
                  currentZoom = 2;
                } else {
                  currentZoom = 1;
                }
                updateImageZoom();
              }
            </script>
          </div>
        `;
      case 'doc':
      case 'docx':
        return `
          <div class="document-viewer">
            <div class="doc-info">
              <h3>📄 Word Document</h3>
              <p>File: ${note.fileName} | Size: ${note.fileSize}</p>
              <p>Word documents cannot be previewed directly in the browser.</p>
            </div>
            <div class="doc-actions">
              <button onclick="downloadFile()" class="download-btn">
                📥 Download to View
              </button>
              <button onclick="openWithGoogleDocs()" class="download-btn" style="margin-left: 1rem;">
                📖 Try Google Docs Viewer
              </button>
            </div>
            <script>
              function openWithGoogleDocs() {
                const googleDocsUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent('${note.fileData}');
                window.open(googleDocsUrl, '_blank');
              }
            </script>
          </div>
        `;
      case 'ppt':
      case 'pptx':
        return `
          <div class="presentation-viewer">
            <div class="ppt-info">
              <h3>📊 PowerPoint Presentation</h3>
              <p>File: ${note.fileName} | Size: ${note.fileSize}</p>
              <p>PowerPoint files cannot be previewed directly in the browser.</p>
            </div>
            <div class="ppt-actions">
              <button onclick="downloadFile()" class="download-btn">
                📥 Download to View
              </button>
              <button onclick="openWithGoogleSlides()" class="download-btn" style="margin-left: 1rem;">
                📊 Try Google Slides Viewer
              </button>
            </div>
            <script>
              function openWithGoogleSlides() {
                const googleSlidesUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent('${note.fileData}');
                window.open(googleSlidesUrl, '_blank');
              }
            </script>
          </div>
        `;
      case 'txt':
      case 'md':
        return `
          <div class="text-viewer">
            <div class="text-controls">
              <span class="text-info">📝 Text Document | ${note.fileSize}</span>
            </div>
            <iframe 
              src="${note.fileData}" 
              style="width: 100%; height: 80vh; border: 1px solid #e5e7eb; border-radius: 8px; background: white;"
            ></iframe>
          </div>
        `;
      default:
        return `
          <div style="text-align: center; padding: 3rem; color: #6b7280;">
            <svg width="64" height="64" viewBox="0 0 16 16" fill="currentColor" style="margin-bottom: 1rem;">
              <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
            </svg>
            <h3>📁 File Preview Not Available</h3>
            <p>This file type (${fileExtension?.toUpperCase()}) cannot be previewed in the browser.</p>
            <p>Supported formats: PDF, Images (JPG, PNG, GIF), Text files</p>
            <button onclick="downloadFile()" class="download-btn" style="margin-top: 1rem;">
              📥 Download File to View
            </button>
          </div>
        `;
    }
  }

  deleteTeacherNote(note: TeacherNote) {
    if (confirm(`Are you sure you want to delete "${note.title}"?`)) {
      this.teacherNotes = this.teacherNotes.filter(n => n.id !== note.id);
      // Note: In future, this should call API to delete teacher notes
      this.toastService.info(`Notes "${note.title}" deleted successfully.`);
    }
  }

  resetNotesForm() {
    this.newNote = {
      title: '',
      chapter: ''
    };
    this.selectedNotesFile = null;
  }

  // Gender detection and avatar methods
  getTeacherAvatar(teacher: Teacher): string {
    // Check if teacher has uploaded a real profile image (not placeholder)
    if (teacher.profileImage && 
        teacher.profileImage.trim() !== '' && 
        !teacher.profileImage.includes('placeholder') &&
        !teacher.profileImage.includes('via.placeholder')) {
      
      // If it's a base64 image, return it directly
      if (teacher.profileImage.startsWith('data:image/')) {
        return teacher.profileImage;
      }
      
      // If it's a server path, prepend the API URL
      if (teacher.profileImage.startsWith('/uploads/')) {
        return environment.apiUrl.replace('/api', '') + teacher.profileImage;
      }
      
      // If it's already a full URL, return it
      if (teacher.profileImage.startsWith('http')) {
        return teacher.profileImage;
      }
    }
    
    // Otherwise, determine gender from name and return appropriate avatar
    return this.getDefaultAvatarByGender(teacher.name);
  }

  getDefaultAvatarByGender(name: string): string {
    const femaleNames = [
      'aisha', 'fatima', 'khadija', 'zainab', 'mariam', 'ayesha', 'sara', 'hina', 'sana', 'nadia',
      'farah', 'rabia', 'samina', 'rubina', 'nasreen', 'shahida', 'bushra', 'farzana', 'shazia', 'tahira',
      'maria', 'aliya', 'sadia', 'fouzia', 'uzma', 'shama', 'razia', 'sultana', 'rashida', 'yasmeen',
      'amna', 'sidra', 'madiha', 'saima', 'nighat', 'parveen', 'shahnaz', 'riffat', 'naheed', 'shamim',
      'asma', 'hajra', 'maryam', 'sahar', 'noor', 'laiba', 'iqra', 'rimsha', 'arooj', 'mehwish',
      'sarah', 'emma', 'olivia', 'ava', 'isabella', 'sophia', 'mia', 'charlotte', 'amelia', 'harper'
    ];

    const maleNames = [
      'muhammad', 'ahmed', 'ali', 'hassan', 'hussain', 'omar', 'usman', 'ibrahim', 'yousuf', 'ismail',
      'tariq', 'khalid', 'rashid', 'salman', 'imran', 'shahid', 'naveed', 'asif', 'iqbal', 'zahid',
      'farhan', 'adnan', 'waqas', 'bilal', 'faisal', 'kamran', 'danish', 'junaid', 'hamza', 'zubair',
      'saeed', 'majid', 'nasir', 'akram', 'ashraf', 'anwar', 'pervez', 'riaz', 'shafiq', 'rafiq',
      'john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles'
    ];

    const firstName = name.toLowerCase().split(' ')[0];
    
    if (femaleNames.includes(firstName)) {
      // Female avatar
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=f3e8ff&color=7c3aed&size=150&font-size=0.6&format=png&rounded=true';
    } else if (maleNames.includes(firstName)) {
      // Male avatar
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=dbeafe&color=3b82f6&size=150&font-size=0.6&format=png&rounded=true';
    } else {
      // Default to neutral avatar if name is not recognized
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=f3f4f6&color=6b7280&size=150&font-size=0.6&format=png&rounded=true';
    }
  }

  onImageError(event: any, teacher: Teacher) {
    // If the uploaded image fails to load, fallback to generated avatar
    event.target.src = this.getDefaultAvatarByGender(teacher.name);
  }

  clearExistingSampleData() {
    if (isPlatformBrowser(this.platformId)) {
      console.log('🧹 Clearing ALL localStorage teacher data...');
      
      // Clear all teacher-related localStorage data
      const keysToRemove = [
        'teachers',
        'teacherNotes',
        'teacherVisibility',
        'teacherVisibilityInitialized',
        'sampleDataCleared',
        'sampleTeachersAdded',
        'uploadedNotes',
        'recentNotes'
      ];
      
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage key: ${key}`);
        }
      });
      
      // Also clear any keys that might contain teacher data
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('teacher') && key !== 'auth_token' && key !== 'currentUser')) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage key: ${key}`);
        }
      }
      
      console.log('✅ All localStorage teacher data cleared - will load from API only');
    }
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Format as: Apr 24, 2026 at 3:02 PM
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) + ' at ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

}
