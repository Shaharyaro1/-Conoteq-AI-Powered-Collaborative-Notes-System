import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../shared/services/notification.service';
import { ToastService } from '../../../shared/services/toast.service';
import { NotesUpdateService } from '../../../shared/services/notes-update.service';
import { ApiService, ApiNote } from '../../../shared/services/api.service.new';

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
  userName?: string;
  rejectionReason?: string;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule, MatTableModule],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, AfterViewInit {
  notes: Note[] = [];
  selectedNote: Note | null = null;
  showViewModal: boolean = false;
  showRejectionModal: boolean = false;
  rejectionReason: string = '';
  noteToReject: Note | null = null;
  
  // Material Paginator
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource: MatTableDataSource<Note>;
  
  // Pagination for display
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;
  


  constructor(
    private notificationService: NotificationService,
    private toastService: ToastService,
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
    console.log('🚀 Admin Notes: Component initializing...');
    this.loadNotesFromAPI();
    
    // Set up periodic refresh to get new notes
    setInterval(() => {
      this.loadNotesFromAPI();
    }, 30000); // Refresh every 30 seconds
  }

  // Pagination methods
  get paginatedNotes(): Note[] {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.notes.slice(startIndex, endIndex);
  }



  // Material Paginator event handler
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.totalItems = this.notes.length;
  }

  loadNotesFromLocalStorage() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('uploadedNotes');
    if (savedNotes) {
      this.notes = JSON.parse(savedNotes);
      this.totalItems = this.notes.length;
      this.dataSource.data = this.notes;
    }
  }

  loadNotesFromAPI() {
    console.log('📥 Admin: Loading all notes from API...');
    
    this.apiService.getAllNotes().subscribe({
      next: (response) => {
        console.log('📥 Admin: Notes loaded from API:', response);
        
        if (response.success && response.data) {
          // Convert ApiNote to Note format
          this.notes = response.data.map(apiNote => ({
            id: apiNote.id,
            notesName: apiNote.notesName,
            subject: apiNote.subject,
            teacherName: apiNote.teacherName,
            fileName: apiNote.fileName,
            fileSize: apiNote.fileSize,
            uploadDate: apiNote.uploadDate,
            status: apiNote.status as 'pending' | 'approved' | 'rejected',
            fileData: '', // Will be loaded when needed
            fileType: apiNote.fileType,
            userName: apiNote.userName,
            rejectionReason: apiNote.rejectionReason
          }));
          
          // Sort by upload date (newest first)
          this.notes.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
        } else {
          this.notes = [];
        }
        
        this.totalItems = this.notes.length;
        this.dataSource.data = this.notes;
        this.updateAdminNotifications();
        
        console.log('✅ Admin: Notes processed:', this.notes.length);
      },
      error: (error) => {
        console.error('❌ Admin: Error loading notes from API:', error);
        this.toastService.error('Failed to load notes from server');
        
        // Fallback to localStorage if API fails
        this.loadNotesFromLocalStorage();
      }
    });
  }

  saveNotesToLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('uploadedNotes', JSON.stringify(this.notes));
      this.totalItems = this.notes.length;
      this.dataSource.data = this.notes;
    }
  }

  approveNote(note: Note) {
    console.log('✅ Admin: Approving note:', note.id);
    
    this.apiService.updateNoteStatus(note.id, 'approved').subscribe({
      next: (response) => {
        if (response.success) {
          // Update local note status
          const noteIndex = this.notes.findIndex(n => n.id === note.id);
          if (noteIndex !== -1) {
            this.notes[noteIndex].status = 'approved';
            this.dataSource.data = [...this.notes]; // Trigger table update
          }
          
          // Show immediate feedback to admin
          this.toastService.success(`Notes "${note.notesName}" has been approved successfully!`);
          
          // Notify same-tab components
          this.notesUpdateService.notifyApproval(note.id, note.notesName);
          
          // Update admin notification count
          this.updateAdminNotifications();
          
          console.log('✅ Admin: Note approved successfully');
        }
      },
      error: (error) => {
        console.error('❌ Admin: Error approving note:', error);
        this.toastService.error('Failed to approve note. Please try again.');
      }
    });
  }

  rejectNote(note: Note) {
    // Open rejection reason modal
    this.noteToReject = note;
    this.rejectionReason = '';
    this.showRejectionModal = true;
  }

  confirmRejectNote() {
    if (!this.noteToReject || !this.rejectionReason.trim()) {
      this.toastService.error('Please provide a rejection reason.');
      return;
    }

    const note = this.noteToReject;
    console.log('❌ Admin: Rejecting note:', note.id, 'Reason:', this.rejectionReason);
    
    this.apiService.updateNoteStatus(note.id, 'rejected', this.rejectionReason.trim()).subscribe({
      next: (response) => {
        if (response.success) {
          // Update local note status
          const noteIndex = this.notes.findIndex(n => n.id === note.id);
          if (noteIndex !== -1) {
            this.notes[noteIndex].status = 'rejected';
            this.notes[noteIndex].rejectionReason = this.rejectionReason.trim();
            this.dataSource.data = [...this.notes]; // Trigger table update
          }
          
          // Show immediate feedback to admin
          this.toastService.warning(`Notes "${note.notesName}" has been rejected.`);
          
          // Notify same-tab components
          this.notesUpdateService.notifyRejection(note.id, note.notesName);
          
          // Update admin notification count
          this.updateAdminNotifications();
          
          console.log('❌ Admin: Note rejected successfully');
        }
      },
      error: (error) => {
        console.error('❌ Admin: Error rejecting note:', error);
        this.toastService.error('Failed to reject note. Please try again.');
      }
    });

    // Close modal
    this.closeRejectionModal();
  }

  closeRejectionModal() {
    this.showRejectionModal = false;
    this.noteToReject = null;
    this.rejectionReason = '';
  }

  viewNote(note: Note) {
    if (!note.fileData) {
      // If no file data, show details modal
      this.selectedNote = note;
      this.showViewModal = true;
      return;
    }

    // Open the file in a new tab
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${note.notesName}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f3f4f6;
            }
            iframe, embed, object {
              width: 100%;
              height: 100vh;
              border: none;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
      `);

      // Check file type and display accordingly
      if (note.fileType?.includes('pdf')) {
        newWindow.document.write(`<embed src="${note.fileData}" type="application/pdf" />`);
      } else if (note.fileType?.includes('image')) {
        newWindow.document.write(`<img src="${note.fileData}" alt="${note.notesName}" />`);
      } else {
        newWindow.document.write(`<iframe src="${note.fileData}"></iframe>`);
      }

      newWindow.document.write(`
        </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      this.toastService.error('Please allow pop-ups to view the file.');
    }
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedNote = null;
  }

  downloadNote(note: Note) {
    console.log('📥 Admin: Downloading note:', note.id);
    
    this.apiService.downloadNote(note.id).subscribe({
      next: (blob) => {
        console.log('✅ Admin: File downloaded successfully');
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = note.fileName;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.toastService.success(`Notes "${note.notesName}" downloaded successfully!`);
      },
      error: (error) => {
        console.error('❌ Admin: Error downloading note:', error);
        this.toastService.error('Failed to download note. Please try again.');
      }
    });
  }

  deleteNote(note: Note) {
    if (confirm('Are you sure you want to delete this note?')) {
      console.log('🗑️ Admin: Deleting note:', note.id);
      
      this.apiService.adminDeleteNote(note.id).subscribe({
        next: (response) => {
          if (response.success) {
            // Remove from local array
            this.notes = this.notes.filter(n => n.id !== note.id);
            this.totalItems = this.notes.length;
            this.dataSource.data = [...this.notes]; // Trigger table update
            
            this.toastService.info(`Notes "${note.notesName}" has been deleted.`);
            this.notesUpdateService.notifyDeletion(note.id, note.notesName);
            this.updateAdminNotifications();
            
            console.log('🗑️ Admin: Note deleted successfully');
          }
        },
        error: (error) => {
          console.error('❌ Admin: Error deleting note:', error);
          this.toastService.error('Failed to delete note. Please try again.');
        }
      });
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

  getPendingCount(): number {
    return this.notes.filter(n => n.status === 'pending').length;
  }

  getApprovedCount(): number {
    return this.notes.filter(n => n.status === 'approved').length;
  }

  getRejectedCount(): number {
    return this.notes.filter(n => n.status === 'rejected').length;
  }

  updateAdminNotifications() {
    const pendingCount = this.notes.filter(n => n.status === 'pending').length;
    this.notificationService.updateAdminNotifications({
      pendingCount,
      statusUpdatesCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    });
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
