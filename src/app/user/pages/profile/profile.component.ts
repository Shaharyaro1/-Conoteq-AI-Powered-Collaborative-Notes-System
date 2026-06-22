import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service.new';
import { UsersService } from '../../../shared/services/users.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile = {
    id: 0,
    name: '',
    username: '',
    email: '',
    role: '',
    status: '',
    createdAt: '',
    lastActive: ''
  };

  originalProfile: any = {};
  isEditing = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.isLoading = true;
    this.errorMessage = '';
    
    const currentUser = this.authService.getCurrentUserValue();
    if (currentUser) {
      this.usersService.getUser(currentUser.id).subscribe({
        next: (user) => {
          this.userProfile = {
            id: user.id,
            name: user.username, // Using username as name for now
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            lastActive: user.lastActive
          };
          this.originalProfile = { ...this.userProfile };
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.errorMessage = 'Failed to load profile data';
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'User not logged in';
      this.isLoading = false;
    }
  }

  toggleEdit() {
    if (this.isEditing) {
      this.saveProfile();
    } else {
      this.isEditing = true;
    }
  }

  saveProfile() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      username: this.userProfile.username,
      email: this.userProfile.email
    };

    this.usersService.updateUser(this.userProfile.id, updateData).subscribe({
      next: (updatedUser) => {
        this.userProfile = {
          id: updatedUser.id,
          name: updatedUser.username,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          createdAt: updatedUser.createdAt,
          lastActive: updatedUser.lastActive
        };
        this.originalProfile = { ...this.userProfile };
        
        // Update the current user in auth service
        this.authService.updateCurrentUser({
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          createdAt: updatedUser.createdAt,
          lastActive: updatedUser.lastActive
        });
        
        this.isEditing = false;
        this.isLoading = false;
        this.successMessage = 'Profile updated successfully!';
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = 'Failed to update profile. Please try again.';
        this.isLoading = false;
      }
    });
  }

  cancelEdit() {
    this.userProfile = { ...this.originalProfile };
    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  getInitials(): string {
    return this.userProfile.name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}