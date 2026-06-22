import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, throwError, timer, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiNote {
  id: number;
  notesName: string;
  subject: string;
  teacherName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  fileData?: string;
  fileType?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: number;
  userName?: string;
  rejectionReason?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface NotificationUpdate {
  noteId: number;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  noteName: string;
}

export interface ApiNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  noteId?: number;
  noteName?: string;
}

export interface CreateNoteDto {
  notesName: string;
  subject: string;
  teacherName: string;
  description?: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string; // Base64 data
  fileType?: string;
  userName?: string;
}

export interface UpdateNoteStatusDto {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private notesSubject = new BehaviorSubject<ApiNote[]>([]);
  private notificationUpdatesSubject = new BehaviorSubject<NotificationUpdate[]>([]);
  private notificationsSubject = new BehaviorSubject<ApiNotification[]>([]);
  
  public notes$ = this.notesSubject.asObservable();
  public notificationUpdates$ = this.notificationUpdatesSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadNotes();
      this.loadNotifications();
      this.startPolling();
    }
  }

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
    console.error('API Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Load notes from API
  private loadNotes(): void {
    this.getNotes().subscribe({
      next: (response) => {
        this.notesSubject.next(response.data || []);
      },
      error: (error) => {
        console.error('Failed to load notes:', error);
        // Fallback to empty array if API fails
        this.notesSubject.next([]);
      }
    });
  }

  // Load notifications from API
  private loadNotifications(): void {
    this.getUserNotifications().subscribe({
      next: (notifications) => {
        this.notificationsSubject.next(notifications);
      },
      error: (error) => {
        console.error('Failed to load notifications:', error);
        // Fallback to empty array if API fails
        this.notificationsSubject.next([]);
      }
    });
  }

  // Start polling for updates
  private startPolling(): void {
    timer(0, 30000).pipe(
      switchMap(() => this.checkForUpdates())
    ).subscribe();
  }

  private checkForUpdates(): Observable<any> {
    // Check for both note updates and new notifications
    const notesUpdate$ = this.getNotes().pipe(
      map((response) => {
        const currentNotes = this.notesSubject.value;
        const newNotes = response.data || [];
        
        // Check for status changes
        const updates: NotificationUpdate[] = [];
        
        currentNotes.forEach(oldNote => {
          const newNote = newNotes.find(n => n.id === oldNote.id);
          if (newNote && newNote.status !== oldNote.status) {
            updates.push({
              noteId: oldNote.id,
              oldStatus: oldNote.status,
              newStatus: newNote.status,
              timestamp: new Date().toISOString(),
              noteName: oldNote.notesName
            });
          }
        });
        
        if (updates.length > 0) {
          this.notificationUpdatesSubject.next(updates);
        }
        
        this.notesSubject.next(newNotes);
        return updates;
      }),
      catchError(() => {
        // Silently handle polling errors
        return of([]);
      })
    );

    const notificationsUpdate$ = this.getUserNotifications().pipe(
      map((notifications) => {
        this.notificationsSubject.next(notifications);
        return notifications;
      }),
      catchError(() => {
        // Silently handle polling errors
        return of([]);
      })
    );

    // Return combined updates
    return notesUpdate$.pipe(
      switchMap(() => notificationsUpdate$)
    );
  }

  // Upload note to API
  uploadNote(noteData: CreateNoteDto): Observable<ApiResponse<ApiNote>> {
    const headers = this.getAuthHeaders();
    
    console.log('📤 API Service: Starting upload process...');
    console.log('📤 Input noteData:', {
      notesName: noteData.notesName,
      subject: noteData.subject,
      teacherName: noteData.teacherName,
      fileName: noteData.fileName,
      fileType: noteData.fileType,
      hasFileData: !!noteData.fileData
    });
    
    // Validate required fields
    if (!noteData.notesName || !noteData.subject || !noteData.teacherName) {
      console.error('❌ Missing required fields');
      return throwError(() => new Error('NotesName, Subject, and TeacherName are required'));
    }
    
    if (!noteData.fileData || !noteData.fileName) {
      console.error('❌ Missing file data or filename');
      return throwError(() => new Error('File is required'));
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('NotesName', noteData.notesName.trim());
    formData.append('Subject', noteData.subject.trim());
    formData.append('TeacherName', noteData.teacherName.trim());
    formData.append('Description', (noteData.description || 'No description provided').trim());
    
    console.log('📤 FormData text fields added:');
    console.log('- NotesName:', noteData.notesName);
    console.log('- Subject:', noteData.subject);
    console.log('- TeacherName:', noteData.teacherName);
    console.log('- Description:', noteData.description || 'No description provided');
    
    // Convert base64 to Blob and create File
    try {
      console.log('📤 Converting base64 to file...');
      console.log('- FileName:', noteData.fileName);
      console.log('- FileType:', noteData.fileType);
      
      // Extract base64 data (remove data:mime;base64, prefix if present)
      const base64Data = noteData.fileData.includes(',') 
        ? noteData.fileData.split(',')[1] 
        : noteData.fileData;
      
      // Convert base64 to binary
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Create Blob
      const blob = new Blob([byteArray], { type: noteData.fileType || 'application/octet-stream' });
      
      // Create File from Blob
      const file = new File([blob], noteData.fileName, { 
        type: noteData.fileType || 'application/octet-stream',
        lastModified: Date.now()
      });
      
      console.log('📤 File created successfully:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Append file to FormData with exact key name expected by backend
      formData.append('File', file, noteData.fileName);
      
      console.log('📤 File appended to FormData');
      
    } catch (error) {
      console.error('❌ Error converting base64 to file:', error);
      return throwError(() => new Error('Failed to process file data'));
    }
    
    console.log('📤 API Service: Uploading note with FormData');
    console.log('📤 URL:', `${this.apiUrl}/notes`);
    console.log('📤 Authorization header:', headers.get('Authorization') ? 'Present' : 'Missing');
    
    // Remove Content-Type header to let browser set it for FormData (with boundary)
    const uploadHeaders = new HttpHeaders({
      'Authorization': headers.get('Authorization') || ''
    });
    
    return this.http.post<ApiNote>(`${this.apiUrl}/notes`, formData, { headers: uploadHeaders }).pipe(
      map(note => {
        console.log('✅ API Service: Note uploaded successfully:', note);
        
        // Update local state
        const currentNotes = this.notesSubject.value;
        const updatedNotes = [note, ...currentNotes];
        this.notesSubject.next(updatedNotes);
        
        return {
          success: true,
          data: note,
          message: 'Note uploaded successfully',
          timestamp: new Date().toISOString()
        };
      }),
      catchError((error) => {
        console.error('❌ API Service: Upload error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        
        // Log validation errors if present
        if (error.error && typeof error.error === 'object') {
          console.error('❌ Validation errors:', error.error);
        }
        
        return throwError(() => error);
      })
    );
  }

  // Get all notes
  getNotes(search?: string, status?: string): Observable<ApiResponse<ApiNote[]>> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    
    console.log('🔗 API Service: Making getNotes request');
    console.log('📤 Headers:', headers);
    console.log('📤 URL:', `${this.apiUrl}/notes`);
    
    return this.http.get<ApiNote[]>(`${this.apiUrl}/notes`, { headers, params }).pipe(
      map(notes => {
        console.log('📥 API Service: getNotes response:', notes);
        return {
          success: true,
          data: notes,
          message: 'Notes retrieved successfully',
          timestamp: new Date().toISOString()
        };
      }),
      catchError((error) => {
        console.error('❌ API Service: getNotes error:', error);
        return this.handleError(error);
      })
    );
  }

  // Get single note with file data
  getNote(noteId: number): Observable<ApiNote> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ApiNote>(`${this.apiUrl}/notes/${noteId}`, { headers }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Update note status (admin function)
  updateNoteStatus(noteId: number, status: 'approved' | 'rejected', rejectionReason?: string): Observable<ApiResponse<ApiNote>> {
    const headers = this.getAuthHeaders();
    const updateData: UpdateNoteStatusDto = { status };
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    console.log('📤 API Service: Updating note status:', { noteId, status, rejectionReason });
    console.log('📤 URL:', `${this.apiUrl}/admin/notes/${noteId}/status`);
    
    return this.http.patch<any>(`${this.apiUrl}/admin/notes/${noteId}/status`, updateData, { headers }).pipe(
      map(response => {
        console.log('✅ API Service: Note status updated:', response);
        
        // Update local state
        const currentNotes = this.notesSubject.value;
        const noteIndex = currentNotes.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
          currentNotes[noteIndex].status = status;
          if (rejectionReason) {
            currentNotes[noteIndex].rejectionReason = rejectionReason;
          }
          this.notesSubject.next([...currentNotes]);
        }
        
        return {
          success: true,
          data: response,
          message: `Note ${status} successfully`,
          timestamp: new Date().toISOString()
        };
      }),
      catchError((error) => {
        console.error('❌ API Service: Error updating note status:', error);
        return this.handleError(error);
      })
    );
  }

  // Delete note
  deleteNote(noteId: number): Observable<ApiResponse<boolean>> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete(`${this.apiUrl}/notes/${noteId}`, { headers }).pipe(
      map(() => {
        // Update local state
        const currentNotes = this.notesSubject.value;
        const filteredNotes = currentNotes.filter(note => note.id !== noteId);
        this.notesSubject.next(filteredNotes);
        
        return {
          success: true,
          data: true,
          message: 'Note deleted successfully',
          timestamp: new Date().toISOString()
        };
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Admin: Delete any note
  adminDeleteNote(noteId: number): Observable<ApiResponse<boolean>> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete(`${this.apiUrl}/admin/notes/${noteId}`, { headers }).pipe(
      map(() => {
        // Update local state
        const currentNotes = this.notesSubject.value;
        const filteredNotes = currentNotes.filter(note => note.id !== noteId);
        this.notesSubject.next(filteredNotes);
        
        return {
          success: true,
          data: true,
          message: 'Note deleted successfully',
          timestamp: new Date().toISOString()
        };
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Get all notes (admin function)
  getAllNotes(search?: string, status?: string): Observable<ApiResponse<ApiNote[]>> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    
    console.log('🔗 API Service: Making getAllNotes request (admin)');
    console.log('📤 Headers:', headers);
    console.log('📤 URL:', `${this.apiUrl}/admin/notes`);
    
    return this.http.get<ApiNote[]>(`${this.apiUrl}/admin/notes`, { headers, params }).pipe(
      map(notes => {
        console.log('📥 API Service: getAllNotes response:', notes);
        return {
          success: true,
          data: notes,
          message: 'Notes retrieved successfully',
          timestamp: new Date().toISOString()
        };
      }),
      catchError((error) => {
        console.error('❌ API Service: getAllNotes error:', error);
        return this.handleError(error);
      })
    );
  }

  // Get pending notes count for admin notifications
  getPendingNotesCount(): Observable<number> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<{ count: number }>(`${this.apiUrl}/admin/notes/pending`, { headers }).pipe(
      map(response => response.count),
      catchError(() => {
        // Fallback to local count if API fails
        return this.notes$.pipe(
          map(notes => notes.filter(note => note.status === 'pending').length)
        );
      })
    );
  }

  // Get recent activities for admin dashboard
  getRecentActivities(limit: number = 5): Observable<any[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<any[]>(`${this.apiUrl}/admin/dashboard/recent-activities?limit=${limit}`, { headers }).pipe(
      catchError(() => {
        // Fallback to local data if API fails
        return this.notes$.pipe(
          map(notes => {
            return notes
              .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
              .slice(0, limit)
              .map(note => ({
                user: note.teacherName,
                action: `Uploaded "${note.notesName}"`,
                time: this.getTimeAgo(note.uploadDate),
                noteName: note.notesName,
                status: note.status
              }));
          })
        );
      })
    );
  }

  // Download note file
  downloadNote(noteId: number): Observable<Blob> {
    const headers = this.getAuthHeaders();
    
    return this.http.get(`${this.apiUrl}/notes/${noteId}/download`, { 
      headers, 
      responseType: 'blob' 
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  private getTimeAgo(dateString: string): string {
    const uploadDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - uploadDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return uploadDate.toLocaleDateString();
  }

  // Request notification permission
  requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      return Promise.resolve('denied');
    }

    return Notification.requestPermission();
  }

  // Get user notifications from API
  getUserNotifications(): Observable<ApiNotification[]> {
    const headers = this.getAuthHeaders();
    const token = this.getToken();
    
    if (!token) {
      return of([]);
    }

    // Extract user ID from token (assuming JWT structure)
    let userId: number;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = parseInt(payload.nameid || payload.sub || payload.userId || '0');
    } catch (error) {
      console.error('Failed to extract user ID from token:', error);
      return of([]);
    }

    if (!userId) {
      return of([]);
    }

    console.log('🔔 API Service: Fetching notifications for user:', userId);
    
    return this.http.get<ApiNotification[]>(`${this.apiUrl}/users/${userId}/notifications`, { headers }).pipe(
      map(notifications => {
        console.log('📥 API Service: Notifications received:', notifications);
        return notifications || [];
      }),
      catchError((error) => {
        console.error('❌ API Service: Error fetching notifications:', error);
        return of([]);
      })
    );
  }

  // Mark notification as read
  markNotificationAsRead(notificationId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();
    
    return this.http.patch(`${this.apiUrl}/notifications/${notificationId}/read`, {}, { headers }).pipe(
      map(() => {
        // Update local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        );
        this.notificationsSubject.next(updatedNotifications);
        return true;
      }),
      catchError((error) => {
        console.error('❌ API Service: Error marking notification as read:', error);
        return of(false);
      })
    );
  }

  // Mark all notifications as read
  markAllNotificationsAsRead(): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const token = this.getToken();
    
    if (!token) {
      return of(false);
    }

    // Extract user ID from token
    let userId: number;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = parseInt(payload.nameid || payload.sub || payload.userId || '0');
    } catch (error) {
      console.error('Failed to extract user ID from token:', error);
      return of(false);
    }

    if (!userId) {
      return of(false);
    }

    return this.http.patch(`${this.apiUrl}/users/${userId}/notifications/read-all`, {}, { headers }).pipe(
      map(() => {
        // Update local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(notification => 
          ({ ...notification, isRead: true })
        );
        this.notificationsSubject.next(updatedNotifications);
        return true;
      }),
      catchError((error) => {
        console.error('❌ API Service: Error marking all notifications as read:', error);
        return of(false);
      })
    );
  }

  // Get unread notifications count
  getUnreadNotificationsCount(): Observable<number> {
    return this.notifications$.pipe(
      map(notifications => notifications.filter(n => !n.isRead).length)
    );
  }
}