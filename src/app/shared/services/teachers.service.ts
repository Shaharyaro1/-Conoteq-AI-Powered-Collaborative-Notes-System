import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Teacher {
  id: number;
  name: string;
  subject: string;
  qualification?: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isActive: boolean;
  isVisible?: boolean;
  createdAt: string;
  notesCount: number;
}


export interface CreateTeacherDto {
  name: string;
  subject: string;
  qualification?: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isActive?: boolean;
}

export interface UpdateTeacherDto {
  name?: string;
  subject?: string;
  qualification?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  isActive?: boolean;
}

export interface TeacherNote {
  id: number;
  title: string;
  chapter: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  fileType?: string;
  teacherId: number;
  fileData?: string;
}

export interface CreateTeacherNoteDto {
  title: string;
  chapter: string;
  fileName: string;
  fileSize: string;
  fileData: string;
  fileType: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeachersService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private handleError(error: any): Observable<never> {
    console.error('Teachers API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get all teachers
  getTeachers(search?: string, isActive?: boolean): Observable<Teacher[]> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    
    if (search) params = params.set('search', search);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());
    
    return this.http.get<Teacher[]>(`${this.apiUrl}/teachers`, { headers, params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get teacher by ID
  getTeacher(id: number): Observable<Teacher> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<Teacher>(`${this.apiUrl}/teachers/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Create teacher (admin only)
  createTeacher(teacherData: CreateTeacherDto): Observable<Teacher> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type for FormData - browser will set it automatically with boundary
    });
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('Name', teacherData.name);
    formData.append('Subject', teacherData.subject);
    
    if (teacherData.qualification) {
      formData.append('Qualification', teacherData.qualification);
    }
    if (teacherData.email) {
      formData.append('Email', teacherData.email);
    }
    if (teacherData.phone) {
      formData.append('Phone', teacherData.phone);
    }
    if (teacherData.bio) {
      formData.append('Bio', teacherData.bio);
    }
    if (teacherData.profileImage) {
      // Convert base64 to Blob if it's a base64 string
      if (teacherData.profileImage.startsWith('data:image/')) {
        const blob = this.base64ToBlob(teacherData.profileImage);
        const fileName = `profile_${Date.now()}.${this.getImageExtension(teacherData.profileImage)}`;
        formData.append('ProfileImage', blob, fileName);
      } else {
        formData.append('ProfileImage', teacherData.profileImage);
      }
    }
    
    return this.http.post<Teacher>(`${this.apiUrl}/teachers`, formData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Update teacher (admin only)
  updateTeacher(id: number, teacherData: UpdateTeacherDto): Observable<Teacher> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type for FormData - browser will set it automatically with boundary
    });
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    if (teacherData.name) {
      formData.append('Name', teacherData.name);
    }
    if (teacherData.subject) {
      formData.append('Subject', teacherData.subject);
    }
    if (teacherData.qualification) {
      formData.append('Qualification', teacherData.qualification);
    }
    if (teacherData.email) {
      formData.append('Email', teacherData.email);
    }
    if (teacherData.phone) {
      formData.append('Phone', teacherData.phone);
    }
    if (teacherData.bio) {
      formData.append('Bio', teacherData.bio);
    }
    if (teacherData.profileImage) {
      // Convert base64 to Blob if it's a base64 string
      if (teacherData.profileImage.startsWith('data:image/')) {
        const blob = this.base64ToBlob(teacherData.profileImage);
        const fileName = `profile_${Date.now()}.${this.getImageExtension(teacherData.profileImage)}`;
        formData.append('ProfileImage', blob, fileName);
      } else {
        formData.append('ProfileImage', teacherData.profileImage);
      }
    }
    if (teacherData.isActive !== undefined) {
      formData.append('IsActive', teacherData.isActive.toString());
    }
    
    return this.http.put<Teacher>(`${this.apiUrl}/teachers/${id}`, formData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Delete teacher (admin only)
  deleteTeacher(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete<void>(`${this.apiUrl}/teachers/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get teacher notes
  getTeacherNotes(teacherId: number): Observable<TeacherNote[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<TeacherNote[]>(`${this.apiUrl}/teachers/${teacherId}/notes`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get specific teacher note
  getTeacherNote(teacherId: number, noteId: number): Observable<TeacherNote> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<TeacherNote>(`${this.apiUrl}/teachers/${teacherId}/notes/${noteId}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Create teacher note (admin only)
  createTeacherNote(teacherId: number, noteData: CreateTeacherNoteDto): Observable<TeacherNote> {
    const headers = this.getAuthHeaders();
    
    return this.http.post<TeacherNote>(`${this.apiUrl}/teachers/${teacherId}/notes`, noteData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Delete teacher note (admin only)
  deleteTeacherNote(teacherId: number, noteId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete<void>(`${this.apiUrl}/teachers/${teacherId}/notes/${noteId}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Download teacher note
  downloadTeacherNote(teacherId: number, noteId: number): Observable<Blob> {
    const headers = this.getAuthHeaders();
    
    return this.http.get(`${this.apiUrl}/teachers/${teacherId}/notes/${noteId}/download`, { 
      headers, 
      responseType: 'blob' 
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get visible teachers for dashboard
  getVisibleTeachers(): Observable<Teacher[]> {
    return this.getTeachers(undefined, true);
  }

  // Toggle teacher visibility (admin only)
  toggleTeacherVisibility(id: number, isActive: boolean): Observable<Teacher> {
    return this.updateTeacher(id, { isActive });
  }

  // Helper method to convert base64 to Blob
  private base64ToBlob(base64: string): Blob {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }

  // Helper method to get image extension from base64
  private getImageExtension(base64: string): string {
    const match = base64.match(/data:image\/(\w+);base64,/);
    return match ? match[1] : 'png';
  }
}