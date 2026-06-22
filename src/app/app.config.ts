import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withFetch, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

import { routes } from './app.routes';
import { AuthInterceptor } from './shared/interceptors/auth.interceptor';
import { AuthService } from './shared/services/auth.service.new';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideFirebaseApp(() => {
      console.log('🔧 Initializing Firebase with config:', environment.firebase);
      const app = initializeApp(environment.firebase);
      console.log('✅ Firebase app initialized:', app);
      return app;
    }),
    provideAuth(() => {
      console.log('🔧 Initializing Firebase Auth');
      const auth = getAuth();
      console.log('✅ Firebase Auth initialized:', auth);
      return auth;
    }),
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideClientHydration(withEventReplay())
  ]
};
