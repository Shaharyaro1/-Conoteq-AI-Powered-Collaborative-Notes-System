import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;

    // Skip interceptor for external API calls (Groq, OpenAI, etc.)
    const isExternalAPI = req.url.includes('api.groq.com') || 
                         req.url.includes('api.openai.com') ||
                         req.url.includes('api.x.ai') ||
                         req.url.includes('generativelanguage.googleapis.com');
    
    if (isExternalAPI) {
      // Let external API requests pass through without modification
      return next.handle(req);
    }

    // Add auth token if available (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
      }
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if this is a signup or login request
        const isAuthRequest = req.url.includes('/auth/register') || 
                             req.url.includes('/auth/login') ||
                             req.url.includes('/auth/signup');
        
        // Handle 401 Unauthorized errors (but not for auth requests or external APIs)
        if (error.status === 401 && !isAuthRequest && !isExternalAPI) {
          // Clear token and redirect to login
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('auth_token');
          }
          this.router.navigate(['/auth/login']);
        }

        // Handle other HTTP errors
        let errorMessage = 'An error occurred';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          switch (error.status) {
            case 0:
              errorMessage = 'Unable to connect to server. Please check if the backend is running.';
              break;
            case 403:
              errorMessage = 'Access denied';
              break;
            case 404:
              errorMessage = 'Resource not found';
              break;
            case 500:
              errorMessage = 'Internal server error';
              break;
            default:
              errorMessage = `HTTP Error ${error.status}`;
          }
        }

        console.error('HTTP Error:', error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}