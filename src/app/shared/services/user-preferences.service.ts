import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserPreferences {
  id?: number;
  userId: number;
  hiddenTeacherIds: number[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
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
    console.error('User Preferences API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get user preferences
  getUserPreferences(): Observable<UserPreferences> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<UserPreferences>(`${this.apiUrl}/user-preferences`, { headers }).pipe(
      tap(prefs => {
        console.log('✅ Loaded user preferences from API:', prefs);
        
        // Sync to localStorage for immediate access
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('hiddenTeacherIds', JSON.stringify(prefs.hiddenTeacherIds));
          console.log('💾 Synced hidden teacher IDs to localStorage:', prefs.hiddenTeacherIds);
        }
      }),
      catchError(error => {
        console.warn('⚠️ Failed to load preferences from API, using defaults:', error);
        
        // Clear localStorage on API failure to prevent stale data
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('hiddenTeacherIds');
          console.log('🗑️ Cleared stale hiddenTeacherIds from localStorage');
        }
        
        // Return default preferences if API fails
        return of({ userId: 0, hiddenTeacherIds: [] });
      })
    );
  }

  // Update user preferences
  updateUserPreferences(hiddenTeacherIds: number[]): Observable<UserPreferences> {
    const headers = this.getAuthHeaders();
    const data = { hiddenTeacherIds };
    
    console.log('💾 Saving user preferences to API:', data);
    
    return this.http.put<UserPreferences>(`${this.apiUrl}/user-preferences`, data, { headers }).pipe(
      tap(prefs => {
        console.log('✅ User preferences saved to API:', prefs);
        
        // Sync to localStorage for immediate UI updates
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('hiddenTeacherIds', JSON.stringify(prefs.hiddenTeacherIds));
          console.log('💾 Synced hidden teacher IDs to localStorage:', prefs.hiddenTeacherIds);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Get hidden teacher IDs (convenience method)
  getHiddenTeacherIds(): Observable<number[]> {
    return this.getUserPreferences().pipe(
      map(prefs => prefs.hiddenTeacherIds || [])
    );
  }

  // Toggle teacher visibility with minimum teacher constraint
  toggleTeacherVisibility(teacherId: number, totalTeachers: number = 0, minimumVisible: number = 4): Observable<UserPreferences> {
    return this.getUserPreferences().pipe(
      map(prefs => {
        const hiddenIds = prefs.hiddenTeacherIds || [];
        const index = hiddenIds.indexOf(teacherId);
        
        if (index > -1) {
          // Remove from hidden list (unhide)
          hiddenIds.splice(index, 1);
        } else {
          // Check if hiding this teacher would violate minimum requirement
          const currentVisibleCount = totalTeachers - hiddenIds.length;
          
          if (currentVisibleCount <= minimumVisible) {
            console.warn(`⚠️ Cannot hide teacher: Would violate minimum ${minimumVisible} teachers requirement`);
            throw new Error(`You must keep at least ${minimumVisible} teachers visible on your dashboard`);
          }
          
          // Add to hidden list (hide)
          hiddenIds.push(teacherId);
        }
        
        return hiddenIds;
      }),
      switchMap(hiddenIds => this.updateUserPreferences(hiddenIds))
    );
  }

  // Check if user can hide a teacher (respects minimum requirement)
  canHideTeacher(teacherId: number, totalTeachers: number, minimumVisible: number = 4): Observable<boolean> {
    return this.getHiddenTeacherIds().pipe(
      map(hiddenIds => {
        const currentVisibleCount = totalTeachers - hiddenIds.length;
        const isCurrentlyHidden = hiddenIds.includes(teacherId);
        
        // If already hidden, can always unhide
        if (isCurrentlyHidden) return true;
        
        // If not hidden, check if hiding would violate minimum
        return currentVisibleCount > minimumVisible;
      })
    );
  }

  // Initialize new user with first 3 teachers visible (updated requirement)
  initializeNewUserPreferences(allTeachers: any[]): Observable<UserPreferences> {
    console.log('🆕 Initializing new user preferences...');
    console.log('📋 Total teachers available:', allTeachers.length);
    
    if (allTeachers.length <= 3) {
      // If 3 or fewer teachers, show all
      console.log('✅ Showing all teachers (3 or fewer available)');
      return this.updateUserPreferences([]);
    } else {
      // Hide teachers beyond the first 3
      const teachersToHide = allTeachers.slice(3).map(t => t.id);
      console.log('🔒 Hiding teachers beyond first 3:', teachersToHide);
      console.log('👥 Visible teachers (first 3):', allTeachers.slice(0, 3).map(t => t.name));
      return this.updateUserPreferences(teachersToHide);
    }
  }

  // Check if user has any preferences set (to detect new users)
  hasExistingPreferences(): Observable<boolean> {
    return this.getUserPreferences().pipe(
      map(prefs => {
        // If preferences exist and have been explicitly set
        return prefs && prefs.id !== undefined;
      }),
      catchError(() => of(false)) // If error, assume no preferences
    );
  }

  // Get visible teacher count
  getVisibleTeacherCount(totalTeachers: number): Observable<number> {
    return this.getHiddenTeacherIds().pipe(
      map(hiddenIds => totalTeachers - hiddenIds.length)
    );
  }
}
