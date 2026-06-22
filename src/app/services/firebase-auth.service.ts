import { Injectable } from '@angular/core';
import { signInWithPopup, signOut, User, onAuthStateChanged, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { auth } from '../firebase.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  user$: Observable<User | null>;

  constructor() {
    console.log('🔧 Direct Firebase Auth Service initialized');
    console.log('🔧 Auth instance:', auth);
    console.log('🔧 Auth app:', auth.app);
    
    this.user$ = new Observable(observer => {
      onAuthStateChanged(auth, observer);
    });
  }

  // Google Login
  async signInWithGoogle(): Promise<any> {
    try {
      console.log('🔄 Starting Google sign-in with direct Firebase...');
      
      // Validate Firebase Auth
      if (!auth) {
        console.error('❌ Firebase Auth is not initialized');
        throw new Error('Firebase Auth is not initialized');
      }

      if (!auth.app) {
        console.error('❌ Firebase App is not connected');
        throw new Error('Firebase App is not properly initialized');
      }

      console.log('✅ Firebase validation passed');
      console.log('🔧 Current domain:', window.location.origin);
      
      console.log('🔄 Creating Google provider...');
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      console.log('✅ Google provider created');
      console.log('🔄 Attempting signInWithPopup...');
      
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Google sign-in successful!');
      console.log('👤 User:', result.user.email);
      return result;
      
    } catch (error: any) {
      console.error('❌ Google sign-in error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Handle specific errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups and try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Domain not authorized. Add localhost:4201 to Firebase authorized domains.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in is not enabled in Firebase Console.');
      } else {
        throw new Error(`Google sign-in failed: ${error.message}`);
      }
    }
  }

  // Facebook Login
  async signInWithFacebook(): Promise<any> {
    try {
      console.log('🔄 Starting Facebook sign-in...');
      
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Facebook sign-in successful');
      return result;
    } catch (error: any) {
      console.error('❌ Facebook sign-in error:', error);
      throw new Error(`Facebook sign-in failed: ${error.message}`);
    }
  }

  // Logout
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!auth.currentUser;
  }
}