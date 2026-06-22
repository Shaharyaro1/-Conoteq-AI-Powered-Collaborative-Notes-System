import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, throwError, Subject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
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

export interface LoginDto {
  username: string;
  password: string;
}

export interface SignupDto {
  name: string;
  username: string;
  email: string;
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
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Subject to notify when new users are registered
  private userRegisteredSubject = new Subject<void>();
  public userRegistered$ = this.userRegisteredSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Load user on app initialization (page refresh)
      this.initializeUser();
    }
  }

  private initializeUser(): void {
    const token = this.getToken();
    if (token) {
      console.log('🔄 AuthService: Token found, loading user data...');
      // Load user data from API to restore state after page refresh
      this.getCurrentUser().subscribe({
        next: (user) => {
          console.log('✅ AuthService: User data loaded after refresh:', user);
          this.currentUserSubject.next(user);
          
          // Emit user loaded event for components that need immediate notification
          if (isPlatformBrowser(this.platformId)) {
            window.dispatchEvent(new CustomEvent('userLoaded', { detail: user }));
          }
        },
        error: (error) => {
          console.error('❌ AuthService: Failed to load user data, token might be expired:', error);
          // Token might be expired, clear it
          this.performLogout();
        }
      });
    } else {
      console.log('ℹ️ AuthService: No token found, user not logged in');
    }
  }

  // Method to manually initialize user (can be called by components)
  public initializeUserIfNeeded(): void {
    const hasToken = this.hasToken();
    const hasUser = !!this.currentUserSubject.value;
    
    if (hasToken && !hasUser) {
      console.log('🔄 AuthService: Manual user initialization requested');
      this.initializeUser();
    }
  }

  private loadCurrentUser(): void {
    // Disabled automatic user loading to prevent redirect issues
    console.log('🚫 Automatic user loading disabled');
    return;
    
    const token = this.getToken();
    if (token) {
      // Only load user if not on auth pages
      const currentUrl = this.router.url;
      if (!currentUrl.includes('/auth/')) {
        this.getCurrentUser().subscribe({
          next: (user) => {
            this.currentUserSubject.next(user);
          },
          error: () => {
            // Token might be expired, clear it
            this.logout();
          }
        });
      }
    }
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

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Login user
  login(loginData: LoginDto): Observable<AuthResponse> {
    // Clear any previous user's data before login
    this.clearUserSpecificData();
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginData).pipe(
      tap(response => {
        this.setToken(response.token);
        this.currentUserSubject.next(response.user);
        console.log('✅ User logged in successfully:', response.user.username);
      }),
      catchError(this.handleError.bind(this))
    );
  }
  
  // Clear user-specific data (helper method)
  private clearUserSpecificData(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('🧹 Clearing previous user-specific data...');
      
      // Remove user preferences (hidden teacher IDs, etc.)
      localStorage.removeItem('hiddenTeacherIds');
      
      // Remove any other user-specific cached data
      const userSpecificKeys = [
        'userPreferences',
        'user_preferences',
        'teacherVisibility',
        'teacher_visibility',
        'cachedUserData',
        'cached_user_data'
      ];
      
      userSpecificKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed: ${key}`);
        }
      });
      
      console.log('✅ Previous user data cleared');
    }
  }

  // Signup user
  signup(signupData: SignupDto): Observable<AuthResponse> {
    console.log('🔗 AuthService: Making signup request to:', `${this.apiUrl}/auth/register`);
    console.log('📤 AuthService: Signup data:', { ...signupData, password: '***' });
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, signupData).pipe(
      tap(response => {
        console.log('✅ AuthService: Signup response received:', response);
        // Automatically log in the user after successful registration
        this.setToken(response.token);
        this.currentUserSubject.next(response.user);
        
        // Notify that a new user has been registered
        this.userRegisteredSubject.next();
        console.log('🎉 New user registered and automatically logged in!');
      }),
      catchError((error) => {
        console.error('❌ AuthService: Signup error:', error);
        return this.handleError(error);
      })
    );
  }

  // Get current user
  getCurrentUser(): Observable<User> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<User>(`${this.apiUrl}/auth/current-user`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Logout user
  logout(): void {
    const headers = this.getAuthHeaders();
    
    // Call logout endpoint (optional, since JWT is stateless)
    this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers }).subscribe({
      complete: () => {
        this.performLogout();
      },
      error: () => {
        // Even if API call fails, perform local logout
        this.performLogout();
      }
    });
  }

  private performLogout(): void {
    // Clear user-specific data from localStorage
    this.clearUserSpecificData();
    
    // Clear authentication token
    this.removeToken();
    
    // Clear current user state
    this.currentUserSubject.next(null);
    
    // Navigate to login page
    this.router.navigate(['/auth/login']);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const hasToken = !!this.getToken();
    const hasUser = !!this.currentUserSubject.value;
    
    // If we have token but no user data, try to load user
    if (hasToken && !hasUser && isPlatformBrowser(this.platformId)) {
      console.log('🔄 AuthService: Token exists but no user data, attempting to load...');
      this.initializeUser();
    }
    
    return hasToken;
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin';
  }

  // Check if user is regular user
  isUser(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'user';
  }

  // Get current user value
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Update current user data
  updateCurrentUser(userData: Partial<User>): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      this.currentUserSubject.next(updatedUser);
    }
  }

  // Check if token exists (for route guards)
  hasToken(): boolean {
    return !!this.getToken();
  }

  // Refresh user data
  refreshUser(): Observable<User> {
    return this.getCurrentUser().pipe(
      tap(user => {
        this.currentUserSubject.next(user);
      })
    );
  }

  // Clear all localStorage data (for cleanup)
  clearAllStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('🧹 Clearing all localStorage data...');
      
      // List current keys
      const keys = Object.keys(localStorage);
      console.log('📋 Current localStorage keys:', keys);
      
      // Clear all localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      console.log('✅ All storage cleared successfully!');
      
      // Reset current user
      this.currentUserSubject.next(null);
    }
  }
}