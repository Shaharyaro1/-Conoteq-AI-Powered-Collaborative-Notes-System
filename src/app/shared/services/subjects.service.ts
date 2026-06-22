import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Subject {
  id: number;
  name: string;
  code?: string;
  department?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectDto {
  name: string;
  code?: string;
  department?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSubjectDto {
  name?: string;
  code?: string;
  department?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SubjectsService {
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
    console.error('Subjects API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get all subjects
  getSubjects(search?: string, isActive?: boolean): Observable<Subject[]> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    
    if (search) params = params.set('search', search);
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());
    
    return this.http.get<Subject[]>(`${this.apiUrl}/subjects`, { headers, params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get subject by ID
  getSubject(id: number): Observable<Subject> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<Subject>(`${this.apiUrl}/subjects/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Create subject
  createSubject(subjectData: CreateSubjectDto): Observable<Subject> {
    const headers = this.getAuthHeaders();
    
    return this.http.post<Subject>(`${this.apiUrl}/subjects`, subjectData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Update subject
  updateSubject(id: number, subjectData: UpdateSubjectDto): Observable<Subject> {
    const headers = this.getAuthHeaders();
    
    return this.http.put<Subject>(`${this.apiUrl}/subjects/${id}`, subjectData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Delete subject
  deleteSubject(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete<void>(`${this.apiUrl}/subjects/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get active subjects
  getActiveSubjects(): Observable<Subject[]> {
    return this.getSubjects(undefined, true);
  }
}