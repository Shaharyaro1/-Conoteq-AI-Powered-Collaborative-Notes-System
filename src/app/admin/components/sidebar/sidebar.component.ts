import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class AdminSidebarComponent {
  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/dashboard', hasDivider: true },
    { icon: 'notes', label: 'Received Notes', route: '/admin/notes', hasDivider: true },
    { icon: 'teacher', label: 'Teachers', route: '/admin/teacher', hasDivider: true },
    { icon: 'users', label: 'User Manager', route: '/admin/user-manager', hasDivider: true },
    { icon: 'settings', label: 'Settings', route: '/admin/settings', hasDivider: true }
  ];

  activeRoute = '/admin/dashboard';
}
