import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule
  ],
  templateUrl: './teacher-notes.component.html',
  styleUrls: ['./teacher-notes.component.css']
})
export class TeacherNotesComponent implements OnInit {
  teacher: Teacher | null = null;
  teacherNotes: TeacherNote[] = [];
  displayedColumns: string[] = ['title', 'chapter', 'fileName', 'fileSize', 'uploadDate', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const teacherId = this.route.snapshot.paramMap.get('id');
    if (teacherId) {
      this.loadTeacher(parseInt(teacherId));
      this.loadTeacherNotes(parseInt(teacherId));
    }
  }

  loadTeacher(teacherId: number) {
    if (isPlatformBrowser(this.platformId)) {
      const savedTeachers = localStorage.getItem('teachers');
      if (savedTeachers) {
        const teachers: Teacher[] = JSON.parse(savedTeachers);
        this.teacher = teachers.find(t => t.id === teacherId) || null;
      }
    }
  }

  loadTeacherNotes(teacherId: number) {
    if (isPlatformBrowser(this.platformId)) {
      const savedNotes = localStorage.getItem('teacherNotes');
      if (savedNotes) {
        const allNotes: TeacherNote[] = JSON.parse(savedNotes);
        this.teacherNotes = allNotes.filter(note => note.teacherId === teacherId);
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
      'farah', 'rabia', 'samina', 'rubina', 'nasreen', 'shahida', 'bushra', 'farzana', 'shazia', 'tahira'
    ];

    const maleNames = [
      'muhammad', 'ahmed', 'ali', 'hassan', 'hussain', 'omar', 'usman', 'ibrahim', 'yousuf', 'ismail',
      'tariq', 'khalid', 'rashid', 'salman', 'imran', 'shahid', 'naveed', 'asif', 'iqbal', 'zahid'
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

  viewNote(note: TeacherNote) {
    if (isPlatformBrowser(this.platformId)) {
      if (note.fileType === 'application/pdf' || note.fileType.includes('pdf')) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${note.title}</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${note.fileData}"></iframe>
            </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        alert('Only PDF files can be viewed in browser');
      }
    }
  }

  downloadNote(note: TeacherNote) {
    if (isPlatformBrowser(this.platformId)) {
      const link = document.createElement('a');
      link.href = note.fileData;
      link.download = note.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  goBack() {
    this.router.navigate(['/user/dashboard']);
  }
}
