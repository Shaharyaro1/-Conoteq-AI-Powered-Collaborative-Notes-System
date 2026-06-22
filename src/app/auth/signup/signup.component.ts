import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service.new';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit, OnDestroy {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  
  private routerSubscription?: Subscription;
  private isNavigatingAway = false;

  constructor(private authService: AuthService, private router: Router) {
    // Immediately prevent any navigation away from signup
    this.preventUnwantedNavigation();
  }

  ngOnInit() {
    console.log('🔄 Signup component initialized');
    console.log('📍 Current URL:', this.router.url);
    
    // Clear any previous form data and messages
    this.clearForm();
    
    // Monitor router events
    this.monitorRouterEvents();
    
    // Force stay on signup page
    this.forceStayOnSignup();
  }

  private preventUnwantedNavigation() {
    // Override router navigate method temporarily
    const originalNavigate = this.router.navigate.bind(this.router);
    
    this.router.navigate = (commands: any[], extras?: any) => {
      console.log('🚨 Navigation attempt detected:', commands);
      
      // Allow navigation only if explicitly triggered by user or component
      if (this.isNavigatingAway) {
        console.log('✅ Allowing explicit navigation');
        return originalNavigate(commands, extras);
      }
      
      // Block navigation to login from signup
      if (Array.isArray(commands) && commands[0] === '/auth/login') {
        console.log('🚫 Blocking automatic navigation to login');
        return Promise.resolve(true);
      }
      
      // Allow other navigations
      return originalNavigate(commands, extras);
    };
  }

  private monitorRouterEvents() {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('🔄 Navigation completed to:', event.url);
        
        // If we're not on signup page and didn't explicitly navigate away, go back
        if (event.url !== '/auth/signup' && !this.isNavigatingAway) {
          console.log('🚫 Unwanted navigation detected, returning to signup');
          setTimeout(() => {
            this.router.navigate(['/auth/signup'], { replaceUrl: true });
          }, 0);
        }
      });
  }

  private forceStayOnSignup() {
    // Periodically check if we're still on signup page
    const checkInterval = setInterval(() => {
      if (this.router.url !== '/auth/signup' && !this.isNavigatingAway) {
        console.log('🚫 Detected unwanted navigation, forcing back to signup');
        this.router.navigate(['/auth/signup'], { replaceUrl: true });
      }
    }, 100);
    
    // Clear interval after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);
  }

  clearForm() {
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  ngOnDestroy() {
    // Clear form when component is destroyed (navigating away)
    this.clearForm();
    
    // Unsubscribe from router events
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Form input handler for debugging
  onFormInput(event: any) {
    console.log('📝 Form input event:', event.target.name, event.target.value);
    console.log('📍 Current route during form input:', this.router.url);
  }

  onUsernameInput(event: any) {
    console.log('📝 Username input event:', event.target.value);
    console.log('📍 Current route during username input:', this.router.url);
  }

  // Input focus/blur handlers for debugging
  onInputFocus(fieldName: string) {
    console.log(`📝 ${fieldName} input focused`);
    console.log('📍 Current route:', this.router.url);
  }

  onInputBlur(fieldName: string) {
    console.log(`📝 ${fieldName} input blurred`);
    console.log('📍 Current route:', this.router.url);
  }

  // Input change handlers for debugging
  onUsernameChange(value: string) {
    console.log('📝 Username changed:', value);
    console.log('📍 Current route before change:', this.router.url);
    this.username = value;
    console.log('📍 Current route after change:', this.router.url);
  }

  onEmailChange(value: string) {
    console.log('📝 Email changed:', value);
    console.log('📍 Current route before change:', this.router.url);
    this.email = value;
    console.log('📍 Current route after change:', this.router.url);
  }

  onPasswordChange(value: string) {
    console.log('📝 Password changed:', value ? '***' : 'empty');
    console.log('📍 Current route before change:', this.router.url);
    this.password = value;
    console.log('📍 Current route after change:', this.router.url);
  }

  // Navigate to login page
  navigateToLogin() {
    console.log('🔄 User explicitly navigating to login page...');
    this.isNavigatingAway = true;
    this.router.navigate(['/auth/login']);
  }

  signup() {
    this.errorMessage = '';
    this.successMessage = '';

    console.log('🚀 Starting signup process...');
    console.log('📝 Form data:', {
      username: this.username,
      email: this.email,
      password: this.password ? '***' : 'empty',
      confirmPassword: this.confirmPassword ? '***' : 'empty'
    });

    if (!this.username || !this.email || !this.password) {
      this.errorMessage = 'Please fill all fields';
      console.log('❌ Validation failed: Missing fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      console.log('❌ Validation failed: Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      console.log('❌ Validation failed: Password too short');
      return;
    }

    // Create user data object - use username as name
    const userData = {
      name: this.username,
      username: this.username,
      email: this.email,
      password: this.password
    };

    console.log('📤 Sending signup request with:', { username: userData.username, email: userData.email });
    console.log('🌐 API URL:', 'http://localhost:5001/api/auth/register');

    this.authService.signup(userData).subscribe({
      next: (response) => {
        console.log('✅ Signup successful:', response);
        this.successMessage = 'Account created successfully! Redirecting to dashboard...';
        
        // Clear the form
        this.clearForm();
        // Keep success message visible
        this.successMessage = 'Account created successfully! Redirecting to dashboard...';
        
        // Redirect to appropriate dashboard based on user role after 1 second
        setTimeout(() => {
          this.isNavigatingAway = true;
          const user = this.authService.getCurrentUserValue();
          if (user?.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/user/dashboard']);
          }
        }, 1000);
      },
      error: (error) => {
        console.error('❌ Signup error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          fullError: error,
          url: error.url
        });
        
        if (error.status === 400) {
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Username or email already exists';
          }
        } else if (error.status === 204) {
          // 204 means success but no content - treat as success
          console.log('✅ Received 204 - treating as success');
          this.successMessage = 'Account created successfully! Redirecting to dashboard...';
          
          // Clear the form
          this.clearForm();
          // Keep success message visible
          this.successMessage = 'Account created successfully! Redirecting to dashboard...';
          
          // Redirect to appropriate dashboard after 1 second
          setTimeout(() => {
            this.isNavigatingAway = true;
            const user = this.authService.getCurrentUserValue();
            if (user?.role === 'admin') {
              this.router.navigate(['/admin/dashboard']);
            } else {
              this.router.navigate(['/user/dashboard']);
            }
          }, 1000);
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        } else {
          this.errorMessage = `Signup failed (${error.status}). Please try again.`;
        }
      }
    });
  }
}
