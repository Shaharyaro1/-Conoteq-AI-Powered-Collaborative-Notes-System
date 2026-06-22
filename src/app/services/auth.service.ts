import { Injectable } from '@angular/core';
import { Auth, signInWithPopup, signOut, User, onAuthStateChanged } from '@angular/fire/auth';
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(private auth: Auth) {
    console.log('🔧 Firebase Auth Service initialized');
    console.log('🔧 Auth instance:', this.auth);
    console.log('🔧 Auth app:', this.auth?.app);
    
    this.user$ = new Observable(observer => {
      onAuthStateChanged(this.auth, observer);
    });
  }

  // Google Login
  async signInWithGoogle(): Promise<any> {
    try {
      console.log('🔄 Starting Google sign-in process...');
      
      // Validate Firebase Auth instance
      if (!this.auth) {
        console.error('❌ Firebase Auth instance is null');
        throw new Error('Firebase Auth is not initialized');
      }

      if (!this.auth.app) {
        console.error('❌ Firebase App is not connected to Auth');
        throw new Error('Firebase App is not properly initialized');
      }

      console.log('✅ Firebase Auth validation passed');
      console.log('🔧 Auth instance details:', {
        app: this.auth.app,
        currentUser: this.auth.currentUser,
        config: this.auth.config
      });
      
      console.log('🔧 Current domain:', window.location.origin);
      
      // Check if we're on the right domain
      const currentDomain = window.location.origin;
      if (currentDomain === 'http://localhost:4201') {
        console.log('⚠️ Running on localhost:4201 - make sure this domain is authorized in Firebase Console');
      }
      
      console.log('🔄 Creating Google provider...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      console.log('✅ Google provider created successfully');
      console.log('🔄 Attempting signInWithPopup...');
      
      const result = await signInWithPopup(this.auth, provider);
      console.log('✅ Google sign-in successful!');
      console.log('👤 User:', result.user.email);
      return result;
      
    } catch (error: any) {
      console.error('❌ Google sign-in error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      
      // Provide specific error messages based on error codes
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in is not enabled in Firebase Console.');
      } else if (error.code === 'auth/argument-error') {
        throw new Error('Firebase configuration error. Check Firebase setup and authorized domains.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Domain not authorized. Add localhost:4201 to Firebase authorized domains.');
      } else if (error.code === 'auth/invalid-api-key') {
        throw new Error('Invalid Firebase API key. Please check configuration.');
      } else if (error.message && error.message.includes('configuration')) {
        throw new Error('Firebase configuration error. Add localhost:4201 to Firebase authorized domains.');
      } else {
        throw new Error(`Google sign-in failed: ${error.code} - ${error.message}`);
      }
    }
  }

  // Facebook Login
  async signInWithFacebook(): Promise<any> {
    try {
      console.log('🔄 Starting Facebook sign-in...');
      
      if (!this.auth || !this.auth.app) {
        throw new Error('Firebase Auth is not properly initialized');
      }
      
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      
      const result = await signInWithPopup(this.auth, provider);
      console.log('✅ Facebook sign-in successful');
      return result;
    } catch (error: any) {
      console.error('❌ Facebook sign-in error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Facebook sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by browser. Please allow popups and try again.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Facebook sign-in is not enabled. Please contact support.');
      } else if (error.code === 'auth/argument-error') {
        throw new Error('Firebase configuration error. Check Firebase setup.');
      } else {
        throw new Error('Facebook sign-in failed. Please try again.');
      }
    }
  }

  // Logout
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }
}