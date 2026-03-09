import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  role = 'user';
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(private authService: AuthService, private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  signup() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.username || !this.email || !this.password) {
      this.errorMessage = 'Please fill all fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    // Create user data object
    const userData = {
      id: Date.now().toString(),
      username: this.username,
      email: this.email,
      password: this.password,
      role: this.role,
      status: 'inactive',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    // Store in localStorage
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if username or email already exists
    const userExists = existingUsers.some((user: any) => 
      user.username === this.username || user.email === this.email
    );

    if (userExists) {
      this.errorMessage = 'Username or email already exists';
      return;
    }

    existingUsers.push(userData);
    localStorage.setItem('users', JSON.stringify(existingUsers));

    const result = this.authService.signup({
      username: this.username,
      email: this.email,
      password: this.password,
      role: this.role
    });

    if (result.success) {
      this.successMessage = 'Account created successfully! Redirecting...';
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    } else {
      this.errorMessage = result.message || 'Signup failed';
    }
  }
}
