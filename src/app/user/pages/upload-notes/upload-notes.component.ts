import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/services/notification.service';
import { NotesUpdateService } from '../../../shared/services/notes-update.service';
import { ApiService, NotificationUpdate } from '../../../shared/services/api.service';
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
    // Subscribe to notes from API service
    const notesSubscription = this.apiService.notes$.subscribe(notes => {
      console.log('📥 Received notes from API:', notes.length);
      this.uploadedNotes = notes as Note[];
      this.applyFilters();
    });

    // Subscribe to notification updates for user feedback
    const notificationSubscription = this.apiService.notificationUpdates$.subscribe(updates => {
      this.handleNotificationUpdates(updates);
    });

    this.subscriptions.push(notesSubscription, notificationSubscription);
    
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
    if (this.selectedFile && this.notesName && this.subject && this.teacherName) {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = () => {
        const noteData = {
          notesName: this.notesName,
          subject: this.subject,
          teacherName: this.teacherName,
          fileName: this.selectedFile!.name,
          fileSize: (this.selectedFile!.size / (1024 * 1024)).toFixed(2) + ' MB',
          fileData: reader.result as string,
          fileType: this.selectedFile!.type
        };
        
        // Use API service to upload
        const uploadSubscription = this.apiService.uploadNote(noteData).subscribe({
          next: (response) => {
            if (response.success) {
              console.log(`Notes "${response.data.notesName}" uploaded successfully!`);
              
              // Notify same-tab components
              this.notesUpdateService.notifyUpload(response.data.id, response.data.notesName);
              
              // Reset form
              this.resetForm();
            }
          },
          error: (error) => {
            console.error('Upload error:', error);
            alert('Failed to upload notes. Please try again.');
          }
        });

        this.subscriptions.push(uploadSubscription);
      };
      
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };
      
      reader.readAsDataURL(this.selectedFile);
    } else {
      alert('Please fill all fields and select a file.');
    }
  }

  private resetForm() {
    this.notesName = '';
    this.subject = '';
    this.teacherName = '';
    this.selectedFile = null;
    
    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('uploadedNotes');
    if (savedNotes) {
      const notes: Note[] = JSON.parse(savedNotes);
      const newStatusCheck: { [key: number]: string } = {};
      
      notes.forEach(note => {
        newStatusCheck[note.id] = note.status;
      });
      
      localStorage.setItem('userLastStatusCheck', JSON.stringify(newStatusCheck));
      
      // Clear notifications in service
      this.notificationService.clearUserNotifications();
    }
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
}
