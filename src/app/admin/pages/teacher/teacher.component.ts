import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherFormComponent } from './teacher-form/teacher-form.component';
import { ToastService } from '../../../shared/services/toast.service';
import { DataService } from '../../../shared/services/data.service';

// Angular Material Imports
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';



interface Teacher {
  id?: number;
  name: string;
  qualification: string;
  subject: string;
  email: string;
  profileImage: string;
  isVisible?: boolean; // For hide/unhide functionality
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

  constructor(
    private toastService: ToastService,
    private dataService: DataService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.dataSource = new MatTableDataSource<Teacher>([]);
  }

  ngAfterViewInit() {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  ngOnInit() {
    console.log('TeacherComponent ngOnInit started');
    
    // Clear any existing sample data on first load
    this.clearExistingSampleData();
    
    this.loadTeachersFromLocalStorage();
    this.loadTeacherNotesFromLocalStorage();
    
    // Add sample teachers if none exist (for pagination testing)
    if (this.teachers.length === 0) {
      this.addSampleTeachers();
    }
    
    this.filteredTeachers = [...this.teachers];
    this.totalItems = this.filteredTeachers.length;

    console.log('After loading - Teachers:', this.teachers.length, 'Filtered:', this.filteredTeachers.length);

    // Initialize the data service with current data
    this.dataService.updateTeachers(this.teachers);
    this.dataService.updateNotes(this.teacherNotes);
  }

  loadTeachersFromLocalStorage() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedTeachers = localStorage.getItem('teachers');
    if (savedTeachers) {
      this.teachers = JSON.parse(savedTeachers);
      this.filteredTeachers = [...this.teachers];
      console.log('Loaded teachers from localStorage:', this.teachers);
    } else {
      console.log('No teachers found in localStorage');
    }
  }

  saveTeachersToLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('teachers', JSON.stringify(this.teachers));
      console.log('✅ Teachers saved to localStorage successfully!');
      console.log('📊 Total teachers in storage:', this.teachers.length);
      console.log('💾 Storage key: "teachers"');
      
      // Verify data was saved
      const savedData = localStorage.getItem('teachers');
      if (savedData) {
        console.log('✓ Verification: Data successfully stored in localStorage');
      }
    }
    // Update the shared service
    this.dataService.updateTeachers(this.teachers);
  }

  onFormSubmit(teacher: Teacher) {
    console.log('📝 Form submitted with teacher data:', teacher);
    
    if (this.isEditMode && this.selectedTeacher) {
      // Update existing teacher
      const index = this.teachers.findIndex(t => t.id === this.selectedTeacher!.id);
      if (index !== -1) {
        this.teachers[index] = { ...teacher, id: this.selectedTeacher.id };
        console.log('✏️ Updated teacher:', this.teachers[index]);
        this.toastService.success(`Teacher "${teacher.name}" updated successfully!`);
      }
    } else {
      // Add new teacher
      const newId = this.teachers.length > 0 
        ? Math.max(...this.teachers.map(t => t.id!)) + 1 
        : 1;
      const newTeacher = { ...teacher, id: newId };
      this.teachers.unshift(newTeacher);
      console.log('➕ Added new teacher:', newTeacher);
      console.log('📊 Total teachers now:', this.teachers.length);
      this.toastService.success(`Teacher "${teacher.name}" added successfully!`);
    }
    
    console.log('💾 Saving to localStorage...');
    this.saveTeachersToLocalStorage();
    this.updateFilteredTeachers();
    console.log('✓ Filtered teachers updated:', this.filteredTeachers.length);
    this.closeFormModal();
  }

  editTeacher(teacher: Teacher) {
    this.selectedTeacher = teacher;
    this.isEditMode = true;
    this.showForm = true;
  }

  deleteTeacher(teacher: Teacher) {
    if (confirm(`Are you sure you want to delete ${teacher.name}?`)) {
      this.teachers = this.teachers.filter(t => t.id !== teacher.id);
      this.saveTeachersToLocalStorage();
      this.updateFilteredTeachers();
      this.toastService.info(`Teacher "${teacher.name}" deleted successfully.`);
    }
  }

  // Toggle teacher visibility
  toggleTeacherVisibility(teacher: Teacher) {
    const index = this.teachers.findIndex(t => t.id === teacher.id);
    if (index !== -1) {
      this.teachers[index].isVisible = !this.teachers[index].isVisible;
      this.saveTeachersToLocalStorage();
      const status = this.teachers[index].isVisible ? 'visible' : 'hidden';
      this.toastService.success(`Teacher "${teacher.name}" is now ${status} on user dashboard.`);
    }
  }

  openAddForm() {
    console.log('Opening add teacher form');
    this.showForm = true;
    this.isEditMode = false;
    this.selectedTeacher = null;
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
        teacher.qualification.toLowerCase().includes(searchLower) ||
        teacher.email.toLowerCase().includes(searchLower)
      );
    }
    this.totalItems = this.filteredTeachers.length;
    this.pageIndex = 0; // Reset to first page when filtering
    console.log('Filtered teachers:', this.filteredTeachers.length);
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



  // Teacher Notes Methods
  loadTeacherNotesFromLocalStorage() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedNotes = localStorage.getItem('teacherNotes');
    if (savedNotes) {
      this.teacherNotes = JSON.parse(savedNotes);
    }
  }

  saveTeacherNotesToLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('teacherNotes', JSON.stringify(this.teacherNotes));
    }
    // Update the shared service
    this.dataService.updateNotes(this.teacherNotes);
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
    if (!this.selectedNotesFile || !this.newNote.title || !this.selectedTeacher?.id) {
      this.toastService.error('Please fill all required fields and select a file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newId = this.teacherNotes.length > 0 
        ? Math.max(...this.teacherNotes.map(n => n.id)) + 1 
        : 1;

      const teacherNote: TeacherNote = {
        id: newId,
        teacherId: this.selectedTeacher!.id!,
        title: this.newNote.title,
        chapter: this.newNote.chapter,
        fileName: this.selectedNotesFile!.name,
        fileSize: (this.selectedNotesFile!.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploadDate: new Date().toLocaleDateString('en-CA'),
        fileData: reader.result as string,
        fileType: this.selectedNotesFile!.type
      };

      this.teacherNotes.unshift(teacherNote);
      this.saveTeacherNotesToLocalStorage();
      this.toastService.success(`Notes "${teacherNote.title}" uploaded successfully!`);
      this.resetNotesForm();
    };

    reader.onerror = () => {
      this.toastService.error('Error reading file. Please try again.');
    };

    reader.readAsDataURL(this.selectedNotesFile);
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
      this.saveTeacherNotesToLocalStorage();
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
        !teacher.profileImage.includes('via.placeholder') &&
        teacher.profileImage.startsWith('data:image/')) {
      return teacher.profileImage;
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
      // Check if there's sample data and clear it ONLY ONCE
      const sampleDataCleared = localStorage.getItem('sampleDataCleared');
      if (!sampleDataCleared) {
        const savedTeachers = localStorage.getItem('teachers');
        if (savedTeachers) {
          const teachers = JSON.parse(savedTeachers);
          // Check if it contains sample data (by checking for sample emails)
          const hasSampleData = teachers.some((teacher: Teacher) => 
            teacher.email && teacher.email.includes('@school.edu')
          );
          
          if (hasSampleData) {
            // Clear sample data
            localStorage.removeItem('teachers');
            localStorage.removeItem('teacherNotes');
          }
        }
        // Mark that sample data has been cleared
        localStorage.setItem('sampleDataCleared', 'true');
      }
    }
  }

  addSampleTeachers() {
    // Only add sample teachers if localStorage is completely empty
    if (!isPlatformBrowser(this.platformId)) return;
    
    const existingTeachers = localStorage.getItem('teachers');
    if (existingTeachers) {
      console.log('Teachers already exist in localStorage, skipping sample data');
      return;
    }

    const sampleTeachers: Teacher[] = [
      {
        id: 1,
        name: 'Ahmed Ali',
        qualification: 'M.Sc Computer Science',
        subject: 'Computer Science',
        email: 'ahmed.ali@gmail.com',
        profileImage: '',
        isVisible: true
      },
      {
        id: 2,
        name: 'Fatima Khan',
        qualification: 'M.A Mathematics',
        subject: 'Mathematics',
        email: 'fatima.khan@gmail.com',
        profileImage: '',
        isVisible: true
      },
      {
        id: 3,
        name: 'Hassan Malik',
        qualification: 'M.Sc Physics',
        subject: 'Physics',
        email: 'hassan.malik@gmail.com',
        profileImage: '',
        isVisible: true
      },
      {
        id: 4,
        name: 'Aisha Siddique',
        qualification: 'M.A English Literature',
        subject: 'English',
        email: 'aisha.siddique@gmail.com',
        profileImage: '',
        isVisible: true
      },
      {
        id: 5,
        name: 'Omar Farooq',
        qualification: 'M.Sc Chemistry',
        subject: 'Chemistry',
        email: 'omar.farooq@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 6,
        name: 'Zainab Ahmed',
        qualification: 'M.A History',
        subject: 'History',
        email: 'zainab.ahmed@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 7,
        name: 'Bilal Sheikh',
        qualification: 'M.Sc Biology',
        subject: 'Biology',
        email: 'bilal.sheikh@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 8,
        name: 'Mariam Qureshi',
        qualification: 'M.A Geography',
        subject: 'Geography',
        email: 'mariam.qureshi@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 9,
        name: 'Tariq Hussain',
        qualification: 'M.Com Business',
        subject: 'Business Studies',
        email: 'tariq.hussain@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 10,
        name: 'Sana Malik',
        qualification: 'M.A Psychology',
        subject: 'Psychology',
        email: 'sana.malik@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 11,
        name: 'Usman Khan',
        qualification: 'M.Sc Statistics',
        subject: 'Statistics',
        email: 'usman.khan@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 12,
        name: 'Hina Ali',
        qualification: 'M.A Sociology',
        subject: 'Sociology',
        email: 'hina.ali@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 13,
        name: 'Kamran Raza',
        qualification: 'M.Sc Economics',
        subject: 'Economics',
        email: 'kamran.raza@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 14,
        name: 'Nadia Iqbal',
        qualification: 'M.A Political Science',
        subject: 'Political Science',
        email: 'nadia.iqbal@gmail.com',
        profileImage: '',
        isVisible: false
      },
      {
        id: 15,
        name: 'Faisal Ahmed',
        qualification: 'M.Sc Environmental Science',
        subject: 'Environmental Science',
        email: 'faisal.ahmed@gmail.com',
        profileImage: '',
        isVisible: false
      }
    ];

    this.teachers = sampleTeachers;
    this.saveTeachersToLocalStorage();
    console.log('Added sample teachers for pagination testing:', this.teachers.length);
  }


}
