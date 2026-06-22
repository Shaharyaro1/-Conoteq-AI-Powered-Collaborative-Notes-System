import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service.new';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class AdminSidebarComponent {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/dashboard', hasDivider: true },
    { icon: 'notes', label: 'Received Notes', route: '/admin/notes', hasDivider: true },
    { icon: 'teacher', label: 'Teachers', route: '/admin/teacher', hasDivider: true },
    { icon: 'users', label: 'User Manager', route: '/admin/user-manager', hasDivider: true },
    { icon: 'settings', label: 'Settings', route: '/admin/settings', hasDivider: true }
  ];

  activeRoute = '/admin/dashboard';

  logout() {
    console.log('🚪 Admin Sidebar: Logout clicked');
    
    // Use proper auth service logout (it will handle the redirect)
    this.authService.logout();
    
    console.log('🚪 Admin Sidebar: Logout initiated');
  }
}
