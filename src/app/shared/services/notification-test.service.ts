import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationTestService {

  // Test method to simulate note status changes
  testNotificationSystem() {
    console.log('Testing notification system...');
    
    // Removed localStorage functionality - notifications would be managed through API
    console.log('Notification test completed (localStorage functionality removed)');
  }
}