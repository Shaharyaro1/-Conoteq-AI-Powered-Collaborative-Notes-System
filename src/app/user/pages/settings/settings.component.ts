import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../shared/services/teachers.service';
import { UserPreferencesService } from '../../../shared/services/user-preferences.service';
import { forkJoin, Subscription } from 'rxjs';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface Teacher {
  id?: number;
  name: string;
  qualification?: string;
  subject: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isActive?: boolean;
  isHidden?: boolean;
  createdAt?: string;
  notesCount?: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSlideToggleModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource: { filteredData: Teacher[] } = { filteredData: [] };
  displayedColumns: string[] = ['profile', 'name', 'qualification', 'subject', 'email', 'visibility'];
  
  teachers: Teacher[] = [];
  filteredTeachers: Teacher[] = [];
  hiddenTeacherIds: number[] = [];
  isLoading: boolean = true;
  
  // Pagination
  pageSize: number = 10;
  pageIndex: number = 0;
  totalItems: number = 0;
  pageSizeOptions: number[] = [5, 10, 15, 20, 50];
  
  private subscriptions: Subscription = new Subscription();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private teachersService: TeachersService,
    private userPreferencesService: UserPreferencesService,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🏗️ Settings Component: Constructor called');
  }

  ngOnInit() {
    console.log('🚀 Settings Component: ngOnInit called');
    this.loadTeachers();
  }

  ngAfterViewInit() {
    console.log('🔄 Settings Component: ngAfterViewInit called');
  }

  ngOnDestroy() {
    console.log('🧹 Settings Component: ngOnDestroy called');
    this.subscriptions.unsubscribe();
  }

  loadTeachers() {
    console.log('👥 Settings: Loading teachers from API...');
    console.log('🔍 Current state - Teachers:', this.teachers.length, 'Loading:', this.isLoading);
    
    this.isLoading = true;
    this.cdr.detectChanges(); // Force update loading state
    
    // Use forkJoin to load both teachers and preferences in parallel
    const sub = forkJoin({
      teachers: this.teachersService.getTeachers(),
      hiddenIds: this.userPreferencesService.getHiddenTeacherIds()
    }).subscribe({
      next: (result) => {
        console.log('✅ Settings: Data loaded successfully');
        console.log('📋 Teachers:', result.teachers.length);
        console.log('🔒 Hidden IDs:', result.hiddenIds);
        
        // Map teachers
        this.teachers = result.teachers.map(t => ({
          id: t.id,
          name: t.name,
          qualification: t.qualification,
          subject: t.subject,
          email: t.email,
          profileImage: t.profileImage || '',
          isHidden: result.hiddenIds.includes(t.id)
        }));

        this.hiddenTeacherIds = result.hiddenIds;
        
        // Save to localStorage for dashboard access
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('hiddenTeacherIds', JSON.stringify(this.hiddenTeacherIds));
          console.log('💾 Saved initial hidden teacher IDs to localStorage:', this.hiddenTeacherIds);
        }
        
        this.filteredTeachers = [...this.teachers];
        this.totalItems = this.filteredTeachers.length;
        this.isLoading = false;
        
        console.log('📊 Total teachers:', this.teachers.length);
        console.log('📈 Total items:', this.totalItems);
        console.log('🔍 Final state - Teachers:', this.teachers.length, 'Loading:', this.isLoading);
        
        // Update data source
        this.updateDataSource();
        
        // Trigger change detection
        this.cdr.detectChanges();
        
        console.log('✅ DataSource updated:', this.dataSource.filteredData.length, 'items');
      },
      error: (error) => {
        console.error('❌ Settings: Failed to load data:', error);
        console.error('❌ Error details:', error);
        
        this.teachers = [];
        this.filteredTeachers = [];
        this.totalItems = 0;
        this.hiddenTeacherIds = [];
        this.isLoading = false;
        this.dataSource.filteredData = [];
        
        // Trigger change detection
        this.cdr.detectChanges();
        
        console.log('❌ ERROR: Failed to load teachers. Please refresh the page.');
      }
    });
    
    this.subscriptions.add(sub);
  }

  updateDataSource() {
    console.log('🔄 Updating data source...');
    console.log('  - Filtered teachers:', this.filteredTeachers.length);
    console.log('  - Page index:', this.pageIndex);
    console.log('  - Page size:', this.pageSize);
    
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    console.log('  - Start index:', startIndex);
    console.log('  - End index:', endIndex);
    
    this.dataSource.filteredData = this.filteredTeachers.slice(startIndex, endIndex);
    
    console.log('  - DataSource items:', this.dataSource.filteredData.length);
    console.log('  - DataSource data:', this.dataSource.filteredData);
  }

  onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateDataSource();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    if (!filterValue) {
      this.filteredTeachers = [...this.teachers];
    } else {
      this.filteredTeachers = this.teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(filterValue) ||
        teacher.subject.toLowerCase().includes(filterValue) ||
        teacher.email.toLowerCase().includes(filterValue) ||
        (teacher.qualification && teacher.qualification.toLowerCase().includes(filterValue))
      );
    }
    
    this.totalItems = this.filteredTeachers.length;
    this.pageIndex = 0; // Reset to first page
    this.updateDataSource();
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
      
      // Log to console instead of showing toast
      console.log(`✅ SUCCESS: ${teacher.name} is now visible on dashboard`);
    } else {
      // Hide - add to hidden list (REMOVED MINIMUM RESTRICTION)
      this.hiddenTeacherIds.push(teacher.id);
      teacher.isHidden = true;
      console.log('🚫 Hiding teacher. New hidden IDs:', this.hiddenTeacherIds);
      
      // Log to console instead of showing toast
      console.log(`ℹ️ INFO: ${teacher.name} is now hidden from dashboard`);
    }

    // Save visibility settings to database
    this.userPreferencesService.updateUserPreferences(this.hiddenTeacherIds).subscribe({
      next: (prefs) => {
        console.log('💾 Saved teacher visibility settings to database:', prefs);
        
        // Also save to localStorage for immediate access
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('hiddenTeacherIds', JSON.stringify(this.hiddenTeacherIds));
          console.log('💾 Saved hidden teacher IDs to localStorage:', this.hiddenTeacherIds);
        }
        
        // Trigger custom event for dashboard to update
        if (isPlatformBrowser(this.platformId)) {
          window.dispatchEvent(new CustomEvent('teacherVisibilityChanged', {
            detail: { hiddenIds: this.hiddenTeacherIds }
          }));
          console.log('📢 Dispatched teacherVisibilityChanged event');
        }
      },
      error: (error) => {
        console.error('❌ Failed to save preferences:', error);
        console.log('❌ ERROR: Failed to save visibility settings');
        
        // Revert the change
        if (!teacher.id) return;
        
        if (index > -1) {
          this.hiddenTeacherIds.push(teacher.id);
          teacher.isHidden = true;
        } else {
          const revertIndex = this.hiddenTeacherIds.indexOf(teacher.id);
          if (revertIndex > -1) {
            this.hiddenTeacherIds.splice(revertIndex, 1);
            teacher.isHidden = false;
          }
        }
      }
    });

    // Refresh filtered data
    this.filteredTeachers = [...this.teachers];
    this.updateDataSource();
  }

  // Check if teacher can be hidden (NO RESTRICTIONS - REMOVED MINIMUM REQUIREMENT)
  canHideTeacher(teacher: Teacher): boolean {
    return true; // All teachers can be hidden or shown freely
  }

  // Get count of visible teachers
  getVisibleTeachersCount(): number {
    return this.teachers.filter(t => !this.hiddenTeacherIds.includes(t.id || 0)).length;
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
}
