import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service.new';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    console.log('🛡️ NoAuthGuard: Checking access to auth pages');
    console.log('📍 Target URL:', state.url);
    console.log('👤 Current user:', this.authService.getCurrentUserValue());
    console.log('🔑 Has token:', this.authService.hasToken());
    
    // Always allow access to auth pages (login/signup)
    // This guard prevents automatic redirects from auth pages
    return true;
  }
}