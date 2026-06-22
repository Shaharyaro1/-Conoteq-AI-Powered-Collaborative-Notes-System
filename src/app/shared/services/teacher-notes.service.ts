import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TeacherNote {
  id: number;
  title: string;
  content: string;
  subject?: string;
  filePath?: string;
  fileName?: string;
  createdAt: string;
  updatedAt?: string;
  teacherId: number;
  teacherName: string;
}

export interface CreateTeacherNoteDto {
  title: string;
  content?: string;
  subject?: string;
  teacherId: number;
  file?: File;
}

@Injectable({
  providedIn: 'root'
})
export class TeacherNotesService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private handleError(error: any): Observable<never> {
    console.error('Teacher Notes API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get all teacher notes
  getAllTeacherNotes(): Observable<TeacherNote[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<TeacherNote[]>(`${this.apiUrl}/teachernotes`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get teacher notes by teacher ID
  getTeacherNotesByTeacherId(teacherId: number): Observable<TeacherNote[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<TeacherNote[]>(`${this.apiUrl}/teachernotes/teacher/${teacherId}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get teacher note by ID
  getTeacherNote(id: number): Observable<TeacherNote> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<TeacherNote>(`${this.apiUrl}/teachernotes/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Create teacher note with file upload
  createTeacherNote(teacherNoteData: CreateTeacherNoteDto): Observable<TeacherNote> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    const formData = new FormData();
    formData.append('title', teacherNoteData.title);
    formData.append('teacherId', teacherNoteData.teacherId.toString());
    
    if (teacherNoteData.content) {
      formData.append('content', teacherNoteData.content);
    }
    
    if (teacherNoteData.subject) {
      formData.append('subject', teacherNoteData.subject);
    }
    
    if (teacherNoteData.file) {
      formData.append('file', teacherNoteData.file);
    }

    return this.http.post<TeacherNote>(`${this.apiUrl}/teachernotes`, formData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Delete teacher note
  deleteTeacherNote(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete<void>(`${this.apiUrl}/teachernotes/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Download teacher note
  downloadTeacherNote(id: number): Observable<Blob> {
    const headers = this.getAuthHeaders();
    
    return this.http.get(`${this.apiUrl}/teachernotes/${id}/download`, { 
      headers, 
      responseType: 'blob' 
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }
}