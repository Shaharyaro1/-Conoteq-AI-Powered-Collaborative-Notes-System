import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminNavbarComponent } from '../components/navbar/navbar.component';
import { AdminSidebarComponent } from '../components/sidebar/sidebar.component';
import { AuthService } from '../../shared/services/auth.service.new';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminNavbarComponent, AdminSidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  
  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Ensure user data is loaded for admin layout
      console.log('👑 AdminLayout: Ensuring admin data is loaded...');
      this.authService.initializeUserIfNeeded();
    }
  }
}
