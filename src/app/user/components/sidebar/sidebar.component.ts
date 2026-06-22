import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../shared/services/auth.service.new';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/user/dashboard', hasDivider: true },
    { icon: 'upload_file', label: 'Upload Notes', route: '/user/upload-notes', hasDivider: true },
    { icon: 'psychology', label: 'AI Assistant', route: '/user/ai', hasDivider: true },
    { 
      icon: 'settings', 
      label: 'Settings', 
      route: '/user/settings',
      hasDropdown: true,
      isOpen: false,
      hasDivider: true,
      children: [
        { icon: 'person', label: 'Profile', route: '/user/profile' },
        { icon: 'school', label: 'Teacher Manager', route: '/user/settings' }
      ]
    }
  ];

  activeRoute = '/user/dashboard';
  
  toggleDropdown(item: any) {
    if (item.hasDropdown) {
      item.isOpen = !item.isOpen;
    }
  }

  logout() {
    console.log('🚪 User Sidebar: Logout clicked');
    
    // Use proper auth service logout (it will handle the redirect)
    this.authService.logout();
    
    console.log('🚪 User Sidebar: Logout initiated');
  }
}
