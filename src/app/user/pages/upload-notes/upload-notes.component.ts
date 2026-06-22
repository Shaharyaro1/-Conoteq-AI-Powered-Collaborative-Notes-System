import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/services/notification.service';
import { NotesUpdateService } from '../../../shared/services/notes-update.service';
import { ApiService, NotificationUpdate, ApiNote } from '../../../shared/services/api.service.new';
import { AuthService } from '../../../shared/services/auth.service.new';
import { Subscription } from 'rxjs';

// Angular Material Imports
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';

interface Note {
  id: number;
  notesName: string;
  subject: string;
  teacherName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  fileData?: string; // Base64 encoded file data
  fileType?: string; // MIME type
  rejectionReason?: string;
}

@Component({
  selector: 'app-upload-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule, MatTableModule],
  templateUrl: './upload-notes.component.html',
  styleUrls: ['./upload-notes.component.css']
})
export class UploadNotesComponent implements OnInit, OnDestroy, AfterViewInit {
  private subscriptions: Subscription[] = [];
  selectedFile: File | null = null;
  
  // Form data
  notesName: string = '';
  subject: string = '';
  teacherName: string = '';
  
  // Subject and Teacher choices with default options
  subjects: string[] = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
    'History',
    'Geography',
    'Economics',
    'Business Studies'
  ];
  teachers: string[] = [
    'Dr. Ahmed Khan',
    'Prof. Sarah Ali',
    'Mr. Hassan Raza',
    'Ms. Fatima Malik',
    'Dr. Usman Sheikh'
  ];

  // Flags for showing add new inputs
  showAddSubject: boolean = false;
  showAddTeacher: boolean = false;
  newSubject: string = '';
  newTeacher: string = '';
  
  // View modal
  showViewModal: boolean = false;
  selectedNote: Note | null = null;
  
  // Uploaded notes list
  uploadedNotes: Note[] = [];
  filteredNotes: Note[] = [];
  
  // Search and filter
  searchTerm: string = '';
  statusFilter: string = '';
  
  // Material Paginator
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource: MatTableDataSource<Note>;
  
  // Pagination for display
  paginatedNotes: Note[] = [];
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;

  constructor(
    private notificationService: NotificationService,
    private notesUpdateService: NotesUpdateService,
    private apiService: ApiService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.dataSource = new MatTableDataSource<Note>([]);
  }
  
  ngAfterViewInit() {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }
  
  ngOnInit() {
    // Load custom subjects and teachers
    this.loadCustomOptions();

    // Load user's notes directly from API instead of subscribing to all notes
    this.loadUserNotes();

    // Subscribe to notification updates for user feedback
    const notificationSubscription = this.apiService.notificationUpdates$.subscribe(updates => {
      this.handleNotificationUpdates(updates);
    });

    this.subscriptions.push(notificationSubscription);
    
    this.markNotificationsAsSeen();
    
    // Initial load - ensure paginatedNotes is set
    if (this.uploadedNotes.length > 0) {
      this.applyFilters();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }



  uploadNotes() {
    // Validate all required fields
    const notesNameTrimmed = this.notesName?.trim();
    const subjectTrimmed = this.subject?.trim();
    const teacherNameTrimmed = this.teacherName?.trim();

    if (!notesNameTrimmed || !subjectTrimmed || !teacherNameTrimmed || !this.selectedFile) {
      alert('Please fill all required fields (Notes Name, Subject, Teacher Name) and select a file.');
      return;
    }

    // Validate field lengths (matching backend validation)
    if (notesNameTrimmed.length > 200) {
      alert('Notes Name must be 200 characters or less.');
      return;
    }
    if (subjectTrimmed.length > 100) {
      alert('Subject must be 100 characters or less.');
      return;
    }
    if (teacherNameTrimmed.length > 100) {
      alert('Teacher Name must be 100 characters or less.');
      return;
    }

    // Auto-save custom subject/teacher if not in list
    if (subjectTrimmed && !this.subjects.includes(subjectTrimmed)) {
      this.subjects.push(subjectTrimmed);
      this.saveSubjectsToLocalStorage();
    }
    if (teacherNameTrimmed && !this.teachers.includes(teacherNameTrimmed)) {
      this.teachers.push(teacherNameTrimmed);
      this.saveTeachersToLocalStorage();
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const currentUser = this.authService.getCurrentUserValue();
      
      console.log('📤 Frontend: Preparing note data for upload');
      console.log('📤 File details:', {
        name: this.selectedFile!.name,
        size: this.selectedFile!.size,
        type: this.selectedFile!.type
      });
      
      const noteData = {
        notesName: notesNameTrimmed,
        subject: subjectTrimmed,
        teacherName: teacherNameTrimmed,
        description: 'No description provided',
        fileName: this.selectedFile!.name,
        fileSize: (this.selectedFile!.size / (1024 * 1024)).toFixed(2) + ' MB',
        fileData: reader.result as string,
        fileType: this.selectedFile!.type || 'application/octet-stream',
        userName: currentUser?.username || 'Unknown User'
      };
      
      console.log('📤 Frontend: Note data prepared:', {
        notesName: noteData.notesName,
        subject: noteData.subject,
        teacherName: noteData.teacherName,
        fileName: noteData.fileName,
        fileType: noteData.fileType,
        hasFileData: !!noteData.fileData
      });
      
      // Use API service to upload
      const uploadSubscription = this.apiService.uploadNote(noteData).subscribe({
        next: (response) => {
          if (response.success) {
            console.log(`✅ Notes "${response.data.notesName}" uploaded successfully!`);
            alert(`Notes "${response.data.notesName}" uploaded successfully!`);
            
            // Notify same-tab components
            this.notesUpdateService.notifyUpload(response.data.id, response.data.notesName);
            
            // Reload user notes to show the new upload
            this.loadUserNotes();
            
            // Reset form
            this.resetForm();
          }
        },
        error: (error) => {
          console.error('❌ Upload error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });
          
          let errorMessage = 'Failed to upload notes. ';
          
          if (error.status === 400) {
            // Show detailed validation errors if available
            if (error.error && typeof error.error === 'object') {
              console.error('❌ Validation errors:', error.error);
              errorMessage += 'Validation failed: ';
              
              // Extract validation error messages
              const errors = error.error.errors || error.error;
              const errorMessages = Object.keys(errors).map(key => {
                const messages = errors[key];
                return Array.isArray(messages) ? messages.join(', ') : messages;
              });
              
              errorMessage += errorMessages.join('; ');
            } else {
              errorMessage += 'Invalid data. Please check all fields are filled correctly.';
            }
          } else if (error.status === 401) {
            errorMessage += 'Authentication failed. Please login again.';
          } else if (error.status === 405) {
            errorMessage += 'Method not allowed. Please check the API endpoint.';
          } else if (error.status === 500) {
            errorMessage += 'Server error. Please try again later.';
          } else {
            errorMessage += 'Please try again.';
          }
          
          alert(errorMessage);
        }
      });

      this.subscriptions.push(uploadSubscription);
    };
    
    reader.onerror = () => {
      console.error('❌ Error reading file');
      alert('Error reading file. Please try again.');
    };
    
    reader.readAsDataURL(this.selectedFile);
  }

  private resetForm() {
    this.notesName = '';
    this.subject = '';
    this.teacherName = '';
    this.selectedFile = null;
    this.showAddSubject = false;
    this.showAddTeacher = false;
    this.newSubject = '';
    this.newTeacher = '';
    
    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // Handle subject dropdown change
  onSubjectChange() {
    if (this.subject === '__add_new__') {
      this.subject = '';
      this.showAddSubject = true;
    }
  }

  // Handle teacher dropdown change
  onTeacherChange() {
    if (this.teacherName === '__add_new__') {
      this.teacherName = '';
      this.showAddTeacher = true;
    }
  }

  // Add new subject
  addNewSubject() {
    if (this.newSubject.trim() && !this.subjects.includes(this.newSubject.trim())) {
      this.subjects.push(this.newSubject.trim());
      this.subject = this.newSubject.trim();
      this.newSubject = '';
      this.showAddSubject = false;
      this.saveSubjectsToLocalStorage();
    } else if (this.newSubject.trim()) {
      alert('This subject already exists!');
    }
  }

  // Add new teacher
  addNewTeacher() {
    if (this.newTeacher.trim() && !this.teachers.includes(this.newTeacher.trim())) {
      this.teachers.push(this.newTeacher.trim());
      this.teacherName = this.newTeacher.trim();
      this.newTeacher = '';
      this.showAddTeacher = false;
      this.saveTeachersToLocalStorage();
    } else if (this.newTeacher.trim()) {
      alert('This teacher already exists!');
    }
  }

  // Cancel adding new subject
  cancelAddSubject() {
    this.showAddSubject = false;
    this.newSubject = '';
    this.subject = '';
  }

  // Cancel adding new teacher
  cancelAddTeacher() {
    this.showAddTeacher = false;
    this.newTeacher = '';
    this.teacherName = '';
  }

  // Removed localStorage functionality for custom subjects
  private saveSubjectsToLocalStorage() {
    // Custom subjects would be saved through API
  }

  // Removed localStorage functionality for custom teachers
  private saveTeachersToLocalStorage() {
    // Custom teachers would be saved through API
  }

  // Removed localStorage functionality
  private loadCustomOptions() {
    // Custom options would be loaded from API
  }

  private loadUserNotes() {
    console.log('📥 Loading user notes from API...');
    
    this.apiService.getNotes().subscribe({
      next: (response) => {
        console.log('📥 User notes loaded from API:', response);
        
        if (response.success && response.data) {
          // Convert ApiNote to Note format
          this.uploadedNotes = response.data.map(apiNote => ({
            id: apiNote.id,
            notesName: apiNote.notesName,
            subject: apiNote.subject,
            teacherName: apiNote.teacherName,
            fileName: apiNote.fileName,
            fileSize: apiNote.fileSize,
            uploadDate: apiNote.uploadDate,
            status: apiNote.status as 'pending' | 'approved' | 'rejected',
            fileData: '',
            fileType: apiNote.fileType,
            rejectionReason: apiNote.rejectionReason
          }));
        } else {
          this.uploadedNotes = [];
        }
        
        this.applyFilters();
        console.log('✅ User notes processed:', this.uploadedNotes.length);
      },
      error: (error) => {
        console.error('❌ Error loading user notes:', error);
        this.uploadedNotes = [];
        this.applyFilters();
      }
    });
  }

  handleNotificationUpdates(updates: NotificationUpdate[]) {
    // The navbar will handle all notifications, no popups needed here
    updates.forEach(update => {
      const userNote = this.uploadedNotes.find(note => note.id === update.noteId);
      if (userNote) {
        console.log(`Note "${update.noteName}" has been ${update.newStatus}`);
      }
    });
  }

  editNote(note: Note) {
    // Populate form with note data for editing
    this.notesName = note.notesName;
    this.subject = note.subject;
    this.teacherName = note.teacherName;
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteNote(id: number) {
    if (confirm('Are you sure you want to delete this note?')) {
      const noteToDelete = this.uploadedNotes.find(note => note.id === id);
      
      const deleteSubscription = this.apiService.deleteNote(id).subscribe({
        next: (response) => {
          if (response.success) {
            if (noteToDelete) {
              console.log(`Notes "${noteToDelete.notesName}" deleted successfully.`);
            }
          }
        },
        error: (error) => {
          console.error('Delete error:', error);
          alert('Failed to delete note. Please try again.');
        }
      });

      this.subscriptions.push(deleteSubscription);
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch(status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      default: return '';
    }
  }

  markNotificationsAsSeen() {
    // Removed localStorage functionality - status tracking would be managed through API
    this.notificationService.clearUserNotifications();
  }

  // Search and filter methods
  onSearch() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.applyFilters();
  }



  // Stats methods
  getTotalNotes(): number {
    return this.uploadedNotes.length;
  }

  getPendingCount(): number {
    return this.uploadedNotes.filter(note => note.status === 'pending').length;
  }

  getApprovedCount(): number {
    return this.uploadedNotes.filter(note => note.status === 'approved').length;
  }

  getRejectedCount(): number {
    return this.uploadedNotes.filter(note => note.status === 'rejected').length;
  }

  // Material Paginator event handler
  onPageChange(event: PageEvent) {
    console.log('📄 Page changed:', event);
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedNotes();
  }

  // Update paginated notes based on current page
  private updatePaginatedNotes() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedNotes = this.filteredNotes.slice(startIndex, endIndex);
    console.log('📄 Paginated Notes:', {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      startIndex,
      endIndex,
      paginatedCount: this.paginatedNotes.length,
      totalFiltered: this.filteredNotes.length
    });
  }

  // Apply filters and update pagination
  applyFilters() {
    console.log('🔍 Applying filters. Total notes:', this.uploadedNotes.length);
    
    // Apply search and status filters
    this.filteredNotes = this.uploadedNotes.filter(note => {
      const matchesSearch = !this.searchTerm || 
        note.notesName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        note.subject.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        note.teacherName.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.statusFilter || note.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    console.log('✅ Filtered notes:', this.filteredNotes.length);
    
    this.totalItems = this.filteredNotes.length;
    this.pageIndex = 0; // Reset to first page
    this.updatePaginatedNotes();
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
