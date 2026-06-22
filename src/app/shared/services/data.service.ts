import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

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
  isVisible?: boolean;
  createdAt?: string;
  notesCount?: number;
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

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private teachersSubject = new BehaviorSubject<Teacher[]>([]);
  private notesSubject = new BehaviorSubject<TeacherNote[]>([]);

  teachers$ = this.teachersSubject.asObservable();
  notes$ = this.notesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // DO NOT auto-load from localStorage - let components control data loading
    console.log('📊 DataService initialized - waiting for API data');
  }

  private loadData() {
    // This method is now deprecated - components should use API data directly
    console.log('⚠️ loadData() called - this method is deprecated, use API data instead');
  }

  updateTeachers(teachers: Teacher[]) {
    console.log('📊 DataService: Updating teachers from API data:', teachers.length);
    this.teachersSubject.next(teachers);
    // DO NOT save to localStorage - keep data in memory only for reactive updates
  }

  updateNotes(notes: TeacherNote[]) {
    console.log('📊 DataService: Updating notes from API data:', notes.length);
    this.notesSubject.next(notes);
    // DO NOT save to localStorage - keep data in memory only for reactive updates
  }

  getTeachersCount(): number {
    return this.teachersSubject.value.length;
  }

  getNotesCount(): number {
    return this.notesSubject.value.length;
  }

  getCurrentTeachers(): Teacher[] {
    return this.teachersSubject.value;
  }

  getCurrentNotes(): TeacherNote[] {
    return this.notesSubject.value;
  }
}