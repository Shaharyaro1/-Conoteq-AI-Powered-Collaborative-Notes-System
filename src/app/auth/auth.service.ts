import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id?: number;
  name?: string;
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  status?: 'active' | 'inactive' | 'blocked';
  createdAt?: string;
  lastActive?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USERS_KEY = 'app_users';
  private readonly CURRENT_USER_KEY = 'current_user';
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDefaultUsers();
      this.loadCurrentUser();
    }
  }

  private loadCurrentUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getToken();
      if (token) {
        // Try to get current user from API
        this.getCurrentUserFromAPI().subscribe({
          next: (user) => {
            this.currentUserSubject.next(user);
          },
          error: () => {
            // Token might be invalid, remove it
            this.removeToken();
          }
        });
      }
    }
  }

  private getCurrentUserFromStorage(): User | null {
    // Removed localStorage functionality
    return null;
  }

  private getCurrentUserFromAPI(): Observable<User> {
    const token = this.getToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    
    return this.http.get<User>(`${this.apiUrl}/auth/current-user`, { headers });
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', token);
    }
  }

  private removeToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
    }
  }

  private initializeDefaultUsers() {
    // Removed localStorage functionality - users will be managed through API only
  }

  private getUsers(): User[] {
    // Removed localStorage functionality - users will be managed through API only
    return [];
  }

  // Login with API only
  login(username: string, password: string): Observable<boolean> {
    const loginData: LoginDto = { username, password };

    if (this.apiUrl) {
      return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginData).pipe(
        tap(response => {
          console.log('Login successful:', response);
          this.setToken(response.token);
          this.currentUserSubject.next(response.user);
        }),
        map(() => true),
        catchError((error) => {
          console.error('Login error:', error);
          return of(false);
        })
      );
    } else {
      // No API URL configured
      console.error('No API URL configured');
      return of(false);
    }
  }

  // Removed localStorage login functionality

  // Signup with API only
  signup(userData: any): Observable<boolean> {
    if (this.apiUrl) {
      return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData).pipe(
        tap(response => {
          // Don't set token or user on signup - user should login manually
          console.log('Signup successful:', response);
        }),
        map(() => true),
        catchError(() => of(false))
      );
    } else {
      // No API URL configured
      return of(false);
    }
  }

  // Removed localStorage signup functionality

  logout(): void {
    // Try API logout if token exists
    const token = this.getToken();
    if (token && this.apiUrl) {
      const headers = { 'Authorization': `Bearer ${token}` };
      this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers }).subscribe({
        complete: () => this.performLogout(),
        error: () => this.performLogout()
      });
    } else {
      this.performLogout();
    }
  }

  private performLogout(): void {
    this.removeToken();
    this.currentUserSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(['/auth/login']);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin';
  }

  isUser(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'user';
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  updateCurrentUser(userData: Partial<User>): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      this.currentUserSubject.next(updatedUser);
    }
  }

  // Get all users (for admin)
  getAllUsers(): User[] {
    return this.getUsers().map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // Add user (for admin) - Removed localStorage functionality
  addUser(userData: User): boolean {
    // Removed localStorage functionality - users will be managed through API only
    return false;
  }

  // Update user (for admin) - Removed localStorage functionality
  updateUser(userId: number, userData: Partial<User>): boolean {
    // Removed localStorage functionality - users will be managed through API only
    return false;
  }

  // Delete user (for admin) - Removed localStorage functionality
  deleteUser(userId: number): boolean {
    // Removed localStorage functionality - users will be managed through API only
    return false;
  }
}