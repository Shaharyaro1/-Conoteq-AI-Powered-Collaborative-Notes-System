import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service.new';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    // Check if user has token
    if (!this.authService.hasToken()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Check if user is logged in and get current user
    if (this.authService.isLoggedIn()) {
      return true;
    }

    // Try to refresh user data
    return this.authService.refreshUser().pipe(
      map(() => true),
      catchError(() => {
        this.router.navigate(['/auth/login']);
        return of(false);
      })
    );
  }
}