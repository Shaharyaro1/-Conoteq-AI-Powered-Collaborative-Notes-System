import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

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

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private teachersSubject = new BehaviorSubject<Teacher[]>([]);
  private notesSubject = new BehaviorSubject<TeacherNote[]>([]);

  teachers$ = this.teachersSubject.asObservable();
  notes$ = this.notesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadData();
  }

  private loadData() {
    if (isPlatformBrowser(this.platformId)) {
      // Load teachers
      const savedTeachers = localStorage.getItem('teachers');
      if (savedTeachers) {
        const teachers = JSON.parse(savedTeachers);
        this.teachersSubject.next(teachers);
      }

      // Load notes
      const savedNotes = localStorage.getItem('teacherNotes');
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        this.notesSubject.next(notes);
      }
    }
  }

  updateTeachers(teachers: Teacher[]) {
    this.teachersSubject.next(teachers);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('teachers', JSON.stringify(teachers));
    }
  }

  updateNotes(notes: TeacherNote[]) {
    this.notesSubject.next(notes);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('teacherNotes', JSON.stringify(notes));
    }
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