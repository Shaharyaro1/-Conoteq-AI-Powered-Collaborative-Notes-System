import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationTestService {

  // Test method to simulate note status changes
  testNotificationSystem() {
    console.log('Testing notification system...');
    
    // Get current notes
    const savedNotes = localStorage.getItem('uploadedNotes');
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      
      // Find a pending note to test with
      const pendingNote = notes.find((note: any) => note.status === 'pending');
      
      if (pendingNote) {
        const oldNotes = JSON.stringify(notes);
        
        // Simulate approval
        setTimeout(() => {
          pendingNote.status = 'approved';
          localStorage.setItem('uploadedNotes', JSON.stringify(notes));
          
          // Trigger storage event
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'uploadedNotes',
            oldValue: oldNotes,
            newValue: JSON.stringify(notes)
          }));
          
          console.log('Simulated note approval');
        }, 2000);
        
        // Simulate rejection after 5 seconds
        setTimeout(() => {
          pendingNote.status = 'rejected';
          localStorage.setItem('uploadedNotes', JSON.stringify(notes));
          
          // Trigger storage event
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'uploadedNotes',
            oldValue: JSON.stringify(notes),
            newValue: JSON.stringify(notes)
          }));
          
          console.log('Simulated note rejection');
        }, 5000);
      } else {
        console.log('No pending notes found for testing');
      }
    } else {
      console.log('No notes found in localStorage');
    }
  }
}