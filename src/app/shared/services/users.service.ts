import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
  lastActive: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: string;
  status?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  totalTeachers: number;
  totalNotes: number;
  pendingNotes: number;
  approvedNotes: number;
  rejectedNotes: number;
}

export interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
  userName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
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
    console.error('Users API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get all users (admin only)
  getUsers(search?: string, role?: string, status?: string): Observable<User[]> {
    console.log('🔑 Getting auth token...');
    const token = this.getToken();
    console.log('Token exists:', !!token);
    
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    if (status) params = params.set('status', status);
    
    console.log('📡 Making API call to:', `${this.apiUrl}/users`);
    
    return this.http.get<User[]>(`${this.apiUrl}/users`, { headers, params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get user by ID (admin only)
  getUser(id: number): Observable<User> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<User>(`${this.apiUrl}/users/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Update user (admin only)
  updateUser(id: number, userData: UpdateUserDto): Observable<User> {
    const headers = this.getAuthHeaders();
    
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, userData, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Delete user (admin only)
  deleteUser(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Update user status (admin only)
  updateUserStatus(id: number, status: string): Observable<User> {
    const headers = this.getAuthHeaders();
    
    return this.http.put<User>(`${this.apiUrl}/users/${id}/status`, { status }, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Get dashboard statistics (admin only)
  getDashboardStats(): Observable<DashboardStats> {
    console.log('🔑 Getting auth token for dashboard stats...');
    const token = this.getToken();
    console.log('Token exists:', !!token);
    
    const headers = this.getAuthHeaders();
    console.log('📡 Making API call to:', `${this.apiUrl}/users/dashboard/stats`);
    
    return this.http.get<DashboardStats>(`${this.apiUrl}/users/dashboard/stats`, { headers }).pipe(
      catchError((error) => {
        console.error('🚨 Dashboard stats API error:', error);
        return this.handleError(error);
      })
    );
  }

  // Get recent activities (admin only)
  getRecentActivities(limit: number = 10): Observable<RecentActivity[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<RecentActivity[]>(`${this.apiUrl}/users/dashboard/recent-activities?limit=${limit}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Toggle user status between active and inactive
  toggleUserStatus(id: number, currentStatus: string): Observable<User> {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return this.updateUserStatus(id, newStatus);
  }

  // Block/unblock user
  blockUser(id: number, block: boolean): Observable<User> {
    const status = block ? 'blocked' : 'active';
    return this.updateUserStatus(id, status);
  }
}