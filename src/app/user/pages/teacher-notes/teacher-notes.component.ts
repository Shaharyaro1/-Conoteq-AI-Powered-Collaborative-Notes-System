import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { TeachersService, Teacher } from '../../../shared/services/teachers.service';
import { TeacherNotesService, TeacherNote } from '../../../shared/services/teacher-notes.service';

@Component({
  selector: 'app-teacher-notes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule
  ],
  templateUrl: './teacher-notes.component.html',
  styleUrls: ['./teacher-notes.component.css']
})
export class TeacherNotesComponent implements OnInit, AfterViewInit {
  teacher: Teacher | null = null;
  teacherNotes: TeacherNote[] = [];
  dataSource: MatTableDataSource<TeacherNote>;
  displayedColumns: string[] = ['title', 'content', 'subject', 'fileName', 'createdAt', 'actions'];
  isLoading: boolean = true;

  // Pagination properties
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;
  pageSizeOptions: number[] = [5, 10, 15, 20, 50];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teachersService: TeachersService,
    private teacherNotesService: TeacherNotesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.dataSource = new MatTableDataSource<TeacherNote>([]);
  }

  ngOnInit() {
    console.log('📚 TeacherNotes Component: Initializing...');
    const teacherId = this.route.snapshot.paramMap.get('id');
    if (teacherId) {
      this.loadTeacher(parseInt(teacherId));
      this.loadTeacherNotes(parseInt(teacherId));
    } else {
      console.error('❌ No teacher ID provided');
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      console.log('✅ Paginator initialized');
    }
  }

  loadTeacher(teacherId: number) {
    console.log('📚 Loading teacher data for ID:', teacherId);
    this.teachersService.getTeacher(teacherId).subscribe({
      next: (teacher) => {
        console.log('✅ Teacher loaded:', teacher);
        this.teacher = teacher;
      },
      error: (error) => {
        console.error('❌ Failed to load teacher:', error);
        this.isLoading = false;
      }
    });
  }

  loadTeacherNotes(teacherId: number) {
    console.log('📝 Loading teacher notes for teacher ID:', teacherId);
    this.teacherNotesService.getTeacherNotesByTeacherId(teacherId).subscribe({
      next: (notes) => {
        console.log('✅ Teacher notes loaded:', notes);
        this.teacherNotes = notes;
        this.dataSource.data = notes;
        this.totalItems = notes.length;
        this.isLoading = false;
        
        // Set up paginator after data is loaded
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (error) => {
        console.error('❌ Failed to load teacher notes:', error);
        this.teacherNotes = [];
        this.dataSource.data = [];
        this.totalItems = 0;
        this.isLoading = false;
      }
    });
  }

  viewNote(note: TeacherNote) {
    console.log('👁️ Opening note for viewing:', note.title);
    if (note.filePath) {
      // Fetch the file for viewing
      this.teacherNotesService.downloadTeacherNote(note.id).subscribe({
        next: (blob) => {
          if (isPlatformBrowser(this.platformId)) {
            // Create object URL from blob
            const fileURL = window.URL.createObjectURL(blob);
            
            // Use window.open with the blob URL directly
            // This should open the file for viewing, not downloading
            const viewWindow = window.open();
            if (viewWindow) {
              viewWindow.location.href = fileURL;
              console.log('📖 File opened for viewing in new tab');
              
              // Clean up after some time
              setTimeout(() => {
                window.URL.revokeObjectURL(fileURL);
              }, 30000); // Keep URL for 30 seconds
            } else {
              // If popup blocked, show message
              alert('Please allow popups to view the file, or check your browser settings.');
            }
          }
        },
        error: (error) => {
          console.error('❌ Failed to open file for viewing:', error);
          alert(`Unable to open "${note.title}" for viewing. Please try again.`);
        }
      });
    } else {
      alert('No file available to view for this note');
    }
  }

  downloadNote(note: TeacherNote) {
    console.log('⬇️ Downloading note:', note.title);
    if (note.filePath) {
      this.teacherNotesService.downloadTeacherNote(note.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          if (isPlatformBrowser(this.platformId)) {
            const link = document.createElement('a');
            link.href = url;
            // Use fileName if available, otherwise extract from filePath, or use title as fallback
            const fileName = note.fileName || 
                           (note.filePath ? note.filePath.split('/').pop() : null) || 
                           `${note.title}.pdf`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        },
        error: (error) => {
          console.error('❌ Failed to download note:', error);
          alert('Failed to download note. Please try again.');
        }
      });
    } else {
      alert('No file available for download');
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getFileExtension(fileName: string): string {
    if (!fileName) return '';
    const name = fileName.includes('/') ? fileName.split('/').pop() || '' : fileName;
    const extension = name.split('.').pop()?.toUpperCase();
    return extension || '';
  }

  getFileName(note: TeacherNote): string {
    // Return only the document name, not the full path
    if (note.fileName) {
      return note.fileName;
    } else if (note.filePath) {
      return note.filePath.split('/').pop() || 'Unknown file';
    }
    return 'No file';
  }

  // Pagination event handler
  onPageChange(event: PageEvent) {
    console.log('📄 Page changed:', event);
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  goBack() {
    console.log('🔙 Navigating back to dashboard');
    this.router.navigate(['/user/dashboard']);
  }
}
