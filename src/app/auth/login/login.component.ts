import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service.new';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService, 
    private firebaseAuth: FirebaseAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('🔄 Login component initialized');
    
    // Clear any previous form data and messages
    this.clearForm();
  }

  clearForm() {
    this.username = '';
    this.password = '';
    this.errorMessage = '';
    this.showPassword = false;
  }

  ngOnDestroy() {
    // Clear form when component is destroyed (navigating away)
    this.clearForm();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Navigate to signup page
  navigateToSignup() {
    console.log('🔄 Navigating to signup page...');
    this.router.navigate(['/auth/signup']);
  }

  login() {
    // Clear any previous error messages
    this.errorMessage = '';
    
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    console.log('🚀 Starting login process...');
    console.log('📝 Login data:', { username: this.username, password: '***' });
    console.log('🌐 API URL:', 'http://localhost:5001/api/auth/login');

    const loginData = { username: this.username, password: this.password };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('✅ Login successful:', response);
        // Clear form on successful login
        this.clearForm();
        
        // Login successful, check user role
        const user = response.user;
        if (user?.role === 'admin') {
          console.log('👑 Admin user, redirecting to admin dashboard');
          this.router.navigate(['/admin/dashboard']);
        } else {
          console.log('👤 Regular user, redirecting to user dashboard');
          this.router.navigate(['/user/dashboard']);
        }
      },
      error: (error) => {
        console.error('❌ Login error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          fullError: error
        });
        this.errorMessage = error.message || 'Invalid username or password';
      }
    });
  }

  // Google Login Method - Using Direct Firebase
  loginWithGoogle() {
    this.errorMessage = ''; // Clear previous errors
    
    console.log('🔄 Starting Google login with direct Firebase...');
    this.firebaseAuth.signInWithGoogle().then(result => {
      console.log('✅ Google login successful:', result);
      
      // Extract user info
      const user = result.user;
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'google'
      };

      // You can save user data to your backend here
      console.log('👤 User data:', userData);
      
      // Navigate to dashboard
      this.router.navigate(['/user/dashboard']);
      
    }).catch((error: any) => {
      console.error('❌ Google login error:', error);
      this.errorMessage = error.message || 'Google login failed. Please try again.';
    });
  }

  // Facebook Login Method - Using Direct Firebase
  loginWithFacebook() {
    this.errorMessage = ''; // Clear previous errors
    
    console.log('🔄 Starting Facebook login with direct Firebase...');
    this.firebaseAuth.signInWithFacebook().then(result => {
      console.log('✅ Facebook login successful:', result);
      
      // Extract user info
      const user = result.user;
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'facebook'
      };

      // You can save user data to your backend here
      console.log('👤 User data:', userData);
      
      // Navigate to dashboard
      this.router.navigate(['/user/dashboard']);
      
    }).catch((error: any) => {
      console.error('❌ Facebook login error:', error);
      this.errorMessage = error.message || 'Facebook login failed. Please try again.';
    });
  }
}