import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+92 300 1234567',
    address: 'Karachi, Pakistan',
    bio: 'Computer Science student passionate about learning new technologies.'
  };

  isEditing = false;

  ngOnInit() {
    console.log('Profile component loaded!');
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    console.log('Loading profile from localStorage...');
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      console.log('Found saved profile:', saved);
      this.userProfile = JSON.parse(saved);
    } else {
      console.log('No saved profile found, using defaults');
      // Save default profile
      this.saveToLocalStorage();
    }
  }

  saveToLocalStorage() {
    console.log('Saving profile to localStorage:', this.userProfile);
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
  }

  toggleEdit() {
    if (this.isEditing) {
      // Save changes
      this.saveToLocalStorage();
      alert('Profile updated successfully!');
    }
    this.isEditing = !this.isEditing;
  }

  cancelEdit() {
    this.isEditing = false;
    this.loadFromLocalStorage(); // Reload original data
  }

  getInitials(): string {
    return this.userProfile.name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}