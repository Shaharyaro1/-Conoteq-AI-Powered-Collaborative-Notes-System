import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NotificationService } from '../../../shared/services/notification.service';
import { ToastService } from '../../../shared/services/toast.service';
import { NotesUpdateService } from '../../../shared/services/notes-update.service';

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
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, MatPaginatorModule, MatTableModule],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, AfterViewInit {
  notes: Note[] = [];
  selectedNote: Note | null = null;
  showViewModal: boolean = false;
  
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
    this.loadNotesFromLocalStorage();
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

  saveNotesToLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('uploadedNotes', JSON.stringify(this.notes));
      this.totalItems = this.notes.length;
      this.dataSource.data = this.notes;
    }
  }

  approveNote(note: Note) {
    const noteIndex = this.notes.findIndex(n => n.id === note.id);
    if (noteIndex !== -1) {
      const oldNotes = JSON.stringify(this.notes);
      this.notes[noteIndex].status = 'approved';
      this.saveNotesToLocalStorage();
      
      // Show immediate feedback to admin
      this.toastService.success(`Notes "${note.notesName}" has been approved successfully!`);
      
      // Notify same-tab components
      this.notesUpdateService.notifyApproval(note.id, note.notesName);
      
      // Trigger storage event for user notification (cross-tab)
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'uploadedNotes',
        oldValue: oldNotes,
        newValue: JSON.stringify(this.notes)
      }));

      // Update admin notification count
      this.updateAdminNotifications();
    }
  }

  rejectNote(note: Note) {
    const noteIndex = this.notes.findIndex(n => n.id === note.id);
    if (noteIndex !== -1) {
      const oldNotes = JSON.stringify(this.notes);
      this.notes[noteIndex].status = 'rejected';
      this.saveNotesToLocalStorage();
      
      // Show immediate feedback to admin
      this.toastService.warning(`Notes "${note.notesName}" has been rejected.`);
      
      // Notify same-tab components
      this.notesUpdateService.notifyRejection(note.id, note.notesName);
      
      // Trigger storage event for user notification (cross-tab)
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'uploadedNotes',
        oldValue: oldNotes,
        newValue: JSON.stringify(this.notes)
      }));

      // Update admin notification count
      this.updateAdminNotifications();
    }
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
    if (!note.fileData) {
      this.toastService.error('File data not available for download.');
      return;
    }

    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = note.fileData;
    link.download = note.fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    
    this.toastService.success(`Notes "${note.notesName}" downloaded successfully!`);
  }

  deleteNote(note: Note) {
    if (confirm('Are you sure you want to delete this note?')) {
      this.notes = this.notes.filter(n => n.id !== note.id);
      this.saveNotesToLocalStorage();
      this.toastService.info(`Notes "${note.notesName}" has been deleted.`);
      this.notesUpdateService.notifyDeletion(note.id, note.notesName);
      this.updateAdminNotifications();
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
}
