import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://api.example.com/v1'; // Replace with actual API URL
  private notesSubject = new BehaviorSubject<ApiNote[]>([]);
  private notificationUpdatesSubject = new BehaviorSubject<NotificationUpdate[]>([]);
  
  public notes$ = this.notesSubject.asObservable();
  public notificationUpdates$ = this.notificationUpdatesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeData();
      this.startPolling();
    }
  }

  private initializeData() {
    if (isPlatformBrowser(this.platformId)) {
      const savedNotes = localStorage.getItem('uploadedNotes');
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        // Convert old date format to ISO strings if needed
        notes.forEach((note: any) => {
          if (note.uploadDate && !note.uploadDate.includes('T')) {
            // Convert YYYY-MM-DD to ISO string
            note.uploadDate = new Date(note.uploadDate + 'T12:00:00.000Z').toISOString();
          }
          if (!note.createdAt) {
            note.createdAt = note.uploadDate;
          }
          if (!note.updatedAt) {
            note.updatedAt = note.uploadDate;
          }
        });
        this.notesSubject.next(notes);
        // Save updated format
        localStorage.setItem('uploadedNotes', JSON.stringify(notes));
      } else {
        // Initialize with sample data with proper timestamps
        this.initializeSampleData();
      }
    }
  }

  private initializeSampleData() {
    const now = new Date();
    const sampleNotes: ApiNote[] = [
      {
        id: 1,
        notesName: 'Introduction to Angular',
        subject: 'Web Development',
        teacherName: 'Mr. Ahmed',
        fileName: 'angular-intro.pdf',
        fileSize: '2.5 MB',
        uploadDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'approved',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        notesName: 'Database Concepts',
        subject: 'Database Management',
        teacherName: 'Ms. Fatima',
        fileName: 'database-notes.pdf',
        fileSize: '1.8 MB',
        uploadDate: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        status: 'pending',
        createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        notesName: 'Java Programming',
        subject: 'Programming',
        teacherName: 'Mr. Ali',
        fileName: 'java-basics.pdf',
        fileSize: '3.2 MB',
        uploadDate: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        status: 'pending',
        createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString()
      }
    ];

    this.notesSubject.next(sampleNotes);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('uploadedNotes', JSON.stringify(sampleNotes));
    }
  }

  // Simulate API polling for real-time updates
  private startPolling() {
    // Poll every 30 seconds for status updates
    timer(0, 30000).pipe(
      switchMap(() => this.checkForUpdates())
    ).subscribe();
  }

  private checkForUpdates(): Observable<NotificationUpdate[]> {
    // Simulate API call - replace with actual HTTP request
    return of([]).pipe(
      map(() => {
        if (!isPlatformBrowser(this.platformId)) return [];
        
        const currentNotes = this.notesSubject.value;
        const lastCheck = localStorage.getItem('lastNotificationCheck');
        const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
        const now = new Date();
        
        // Simulate some status changes for demo
        const updates: NotificationUpdate[] = [];
        
        currentNotes.forEach(note => {
          // Simulate random status changes for pending notes
          if (note.status === 'pending' && Math.random() > 0.95) {
            const newStatus = Math.random() > 0.5 ? 'approved' : 'rejected';
            updates.push({
              noteId: note.id,
              oldStatus: note.status,
              newStatus,
              timestamp: now.toISOString(),
              noteName: note.notesName
            });
            
            // Update the note status
            note.status = newStatus as 'approved' | 'rejected';
            note.updatedAt = now.toISOString();
          }
        });
        
        if (updates.length > 0) {
          this.notesSubject.next([...currentNotes]);
          this.saveNotesToStorage(currentNotes);
          this.notificationUpdatesSubject.next(updates);
        }
        
        localStorage.setItem('lastNotificationCheck', now.toISOString());
        return updates;
      })
    );
  }

  // Upload notes to API
  uploadNote(noteData: Omit<ApiNote, 'id' | 'uploadDate' | 'status'>): Observable<ApiResponse<ApiNote>> {
    // Simulate API call - replace with actual HTTP request
    return of(null).pipe(
      map(() => {
        const now = new Date();
        const newNote: ApiNote = {
          ...noteData,
          id: Date.now(),
          uploadDate: now.toISOString(), // Use ISO string for proper timestamp
          status: 'pending',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };

        const currentNotes = this.notesSubject.value;
        const updatedNotes = [newNote, ...currentNotes];
        
        this.notesSubject.next(updatedNotes);
        this.saveNotesToStorage(updatedNotes);
        
        // Trigger immediate notification for admin
        this.triggerAdminNotification(newNote);

        return {
          success: true,
          data: newNote,
          message: 'Note uploaded successfully',
          timestamp: new Date().toISOString()
        };
      })
    );
  }

  // Get all notes
  getNotes(): Observable<ApiResponse<ApiNote[]>> {
    return of({
      success: true,
      data: this.notesSubject.value,
      message: 'Notes retrieved successfully',
      timestamp: new Date().toISOString()
    });
  }

  // Update note status (admin function)
  updateNoteStatus(noteId: number, status: 'approved' | 'rejected'): Observable<ApiResponse<ApiNote>> {
    return of(null).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value;
        const noteIndex = currentNotes.findIndex(note => note.id === noteId);
        
        if (noteIndex === -1) {
          throw new Error('Note not found');
        }

        const oldStatus = currentNotes[noteIndex].status;
        currentNotes[noteIndex].status = status;
        currentNotes[noteIndex].updatedAt = new Date().toISOString();
        
        this.notesSubject.next([...currentNotes]);
        this.saveNotesToStorage(currentNotes);
        
        // Trigger notification update
        const update: NotificationUpdate = {
          noteId,
          oldStatus,
          newStatus: status,
          timestamp: new Date().toISOString(),
          noteName: currentNotes[noteIndex].notesName
        };
        
        this.notificationUpdatesSubject.next([update]);

        return {
          success: true,
          data: currentNotes[noteIndex],
          message: `Note ${status} successfully`,
          timestamp: new Date().toISOString()
        };
      })
    );
  }

  // Delete note
  deleteNote(noteId: number): Observable<ApiResponse<boolean>> {
    return of(null).pipe(
      map(() => {
        const currentNotes = this.notesSubject.value;
        const filteredNotes = currentNotes.filter(note => note.id !== noteId);
        
        this.notesSubject.next(filteredNotes);
        this.saveNotesToStorage(filteredNotes);

        return {
          success: true,
          data: true,
          message: 'Note deleted successfully',
          timestamp: new Date().toISOString()
        };
      })
    );
  }

  // Get pending notes count for admin notifications
  getPendingNotesCount(): Observable<number> {
    return this.notes$.pipe(
      map(notes => notes.filter(note => note.status === 'pending').length)
    );
  }

  // Get recent activities for admin dashboard
  getRecentActivities(limit: number = 5): Observable<any[]> {
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
  }

  private triggerAdminNotification(note: ApiNote) {
    // Trigger browser notification if permission granted
    if (isPlatformBrowser(this.platformId) && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('New Note Uploaded', {
          body: `${note.teacherName} uploaded "${note.notesName}"`,
          icon: '/favicon.ico',
          tag: `note-${note.id}`
        });
      }
    }
  }

  private saveNotesToStorage(notes: ApiNote[]) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('uploadedNotes', JSON.stringify(notes));
      
      // Trigger storage event for cross-tab updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'uploadedNotes',
        newValue: JSON.stringify(notes)
      }));
    }
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
}