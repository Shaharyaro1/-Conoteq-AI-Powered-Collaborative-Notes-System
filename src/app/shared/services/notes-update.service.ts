import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface NotesUpdateEvent {
  type: 'approve' | 'reject' | 'delete' | 'upload';
  noteId: number;
  noteName: string;
  oldStatus?: string;
  newStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotesUpdateService {
  private notesUpdateSubject = new Subject<NotesUpdateEvent>();
  public notesUpdate$ = this.notesUpdateSubject.asObservable();

  notifyNotesUpdate(event: NotesUpdateEvent) {
    this.notesUpdateSubject.next(event);
  }

  // Convenience methods
  notifyApproval(noteId: number, noteName: string) {
    this.notifyNotesUpdate({
      type: 'approve',
      noteId,
      noteName,
      oldStatus: 'pending',
      newStatus: 'approved'
    });
  }

  notifyRejection(noteId: number, noteName: string) {
    this.notifyNotesUpdate({
      type: 'reject',
      noteId,
      noteName,
      oldStatus: 'pending',
      newStatus: 'rejected'
    });
  }

  notifyDeletion(noteId: number, noteName: string) {
    this.notifyNotesUpdate({
      type: 'delete',
      noteId,
      noteName
    });
  }

  notifyUpload(noteId: number, noteName: string) {
    this.notifyNotesUpdate({
      type: 'upload',
      noteId,
      noteName,
      newStatus: 'pending'
    });
  }
}