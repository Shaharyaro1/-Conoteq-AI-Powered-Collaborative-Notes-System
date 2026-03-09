import { Component, OnInit, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';

interface Teacher {
  id?: number;
  name: string;
  qualification: string;
  subject: string;
  email: string;
  profileImage: string;
  isHidden?: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatCardModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  displayedColumns: string[] = ['profileImage', 'name', 'subject', 'qualification', 'email', 'status', 'actions'];
  dataSource: MatTableDataSource<Teacher>;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  teachers: Teacher[] = [];
  hiddenTeacherIds: number[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.dataSource = new MatTableDataSource<Teacher>([]);
  }

  ngOnInit() {
    this.loadTeachers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadTeachers() {
    if (isPlatformBrowser(this.platformId)) {
      // Load teachers
      const savedTeachers = localStorage.getItem('teachers');
      if (savedTeachers) {
        this.teachers = JSON.parse(savedTeachers);
      }

      // Load visibility settings
      const visibilitySettings = localStorage.getItem('teacherVisibility');
      if (visibilitySettings) {
        this.hiddenTeacherIds = JSON.parse(visibilitySettings);
      }

      // Mark hidden teachers
      this.teachers.forEach(teacher => {
        teacher.isHidden = this.hiddenTeacherIds.includes(teacher.id || 0);
      });

      this.dataSource.data = this.teachers;
    }
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  toggleVisibility(teacher: Teacher) {
    if (!teacher.id) return;

    const index = this.hiddenTeacherIds.indexOf(teacher.id);
    
    console.log('🔄 Toggle visibility for teacher:', teacher.name, 'ID:', teacher.id);
    console.log('📋 Current hidden IDs:', this.hiddenTeacherIds);
    
    if (index > -1) {
      // Unhide - remove from hidden list
      this.hiddenTeacherIds.splice(index, 1);
      teacher.isHidden = false;
      console.log('✅ Unhiding teacher. New hidden IDs:', this.hiddenTeacherIds);
      
      // Calculate how many visible teachers there will be
      const visibleCount = this.teachers.filter(t => !this.hiddenTeacherIds.includes(t.id || 0)).length;
      console.log('👥 Total visible teachers now:', visibleCount);
      
      this.showToast(`${teacher.name} is now visible on dashboard`, 'success');
    } else {
      // Hide - add to hidden list
      this.hiddenTeacherIds.push(teacher.id);
      teacher.isHidden = true;
      console.log('🚫 Hiding teacher. New hidden IDs:', this.hiddenTeacherIds);
      this.showToast(`${teacher.name} is now hidden from dashboard`, 'info');
    }

    // Save to localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('teacherVisibility', JSON.stringify(this.hiddenTeacherIds));
      console.log('💾 Saved to localStorage:', JSON.stringify(this.hiddenTeacherIds));
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'teacherVisibility',
        newValue: JSON.stringify(this.hiddenTeacherIds),
        storageArea: localStorage
      }));
      console.log('📡 Dispatched storage event');
    }

    // Refresh table
    this.dataSource.data = [...this.teachers];
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

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    if (isPlatformBrowser(this.platformId)) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      
      const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
      
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${bgColor};
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
}
