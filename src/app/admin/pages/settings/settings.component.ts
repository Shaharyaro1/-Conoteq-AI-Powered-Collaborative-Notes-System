import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class AdminSettingsComponent {
  settings = {
    name: 'Admin User',
    email: 'admin@example.com',
    notifications: true,
    autoApprove: false,
    maxFileSize: '10'
  };

  saveSettings() {
    console.log('Admin settings saved:', this.settings);
    alert('Settings saved successfully!');
  }
}
