import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USERS_KEY = 'app_users';
  private readonly CURRENT_USER_KEY = 'current_user';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDefaultUsers();
    }
  }

  private initializeDefaultUsers() {
    const users = this.getUsers();
    if (users.length === 0) {
      // Add default admin and user
      const defaultUsers = [
        {
          name: 'Admin User',
          username: 'admin',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin'
        },
        {
          name: 'John Doe',
          username: 'user',
          email: 'user@example.com',
          password: 'user123',
          role: 'user'
        },
        {
          name: 'shaharyar',
          username: 'sheri',
          email: 'sheri@example.com',
          password: 'sheri123',
          role: 'user'
        }
      ];
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
      }
    }
  }

  private getUsers(): any[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    const users = localStorage.getItem(this.USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  signup(userData: any): { success: boolean; message?: string } {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, message: 'Not available on server' };
    }

    const users = this.getUsers();
    
    // Check if username already exists
    const existingUser = users.find((u: any) => u.username === userData.username);
    if (existingUser) {
      return { success: false, message: 'Username already exists' };
    }

    // Check if email already exists
    const existingEmail = users.find((u: any) => u.email === userData.email);
    if (existingEmail) {
      return { success: false, message: 'Email already exists' };
    }

    // Add new user
    users.push(userData);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    
    return { success: true };
  }

  login(username: string, password: string): { success: boolean; message?: string; role?: string } {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, message: 'Not available on server' };
    }

    // Get users from localStorage - check both keys
    let allUsers = this.getUsers(); // Check app_users first
    
    // Also check 'users' key for backward compatibility
    if (allUsers.length === 0) {
      const storedUsers = localStorage.getItem('users');
      allUsers = storedUsers ? JSON.parse(storedUsers) : [];
    }

    const userIndex = allUsers.findIndex((u: any) => u.username === username && u.password === password);

    if (userIndex !== -1) {
      const user = allUsers[userIndex];
      
      // No block check - all users can login
      // Update last active time and ensure status is active
      allUsers[userIndex] = {
        ...user,
        status: 'active',
        lastActive: new Date().toISOString()
      };
      
      // Save updated users back to localStorage (use both keys for compatibility)
      localStorage.setItem(this.USERS_KEY, JSON.stringify(allUsers));
      localStorage.setItem('users', JSON.stringify(allUsers));

      // Store current user
      const currentUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: 'active'
      };
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(currentUser));
      
      return { success: true, role: user.role };
    }

    return { success: false, message: 'Invalid username or password' };
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      const currentUser = this.getCurrentUser();
      
      if (currentUser) {
        // Update lastActive time only, don't change status
        // Status should only be changed by admin (blocked/active)
        const storedUsers = localStorage.getItem('users');
        if (storedUsers) {
          const allUsers = JSON.parse(storedUsers);
          const userIndex = allUsers.findIndex((u: any) => u.username === currentUser.username);
          
          if (userIndex !== -1) {
            allUsers[userIndex] = {
              ...allUsers[userIndex],
              lastActive: new Date().toISOString()
            };
            localStorage.setItem('users', JSON.stringify(allUsers));
          }
        }
      }
      
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }

  getCurrentUser(): any {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const user = localStorage.getItem(this.CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  }

  isUser(): boolean {
    const user = this.getCurrentUser();
    return user && user.role === 'user';
  }

  updateCurrentUser(userData: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userData));
    }
  }
}
