import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { UserLayoutComponent } from './user/user-layout/user-layout.component';
import { UserDashboardComponent } from './user/pages/user-dashboard/user-dashboard.component';
import { UploadNotesComponent } from './user/pages/upload-notes/upload-notes.component';
import { AiComponent } from './user/pages/ai/ai.component';
import { SettingsComponent } from './user/pages/settings/settings.component';
import { ThemeComponent } from './user/pages/theme/theme.component';
import { TeacherNotesComponent } from './user/pages/teacher-notes/teacher-notes.component';
import { ProfileComponent } from './user/pages/profile/profile.component';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/admin-dashboard/admin-dashboard.component';
import { NotesComponent } from './admin/pages/notes/notes.component';
import { TeacherComponent } from './admin/pages/teacher/teacher.component';
import { UserManagerComponent } from './admin/pages/manage-users/user-manager/user-manager.component';
import { AdminSettingsComponent } from './admin/pages/settings/settings.component';
import { AdminThemeComponent } from './admin/pages/theme/theme.component';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/signup', component: SignupComponent },
  { 
    path: 'user',
    component: UserLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: UserDashboardComponent },
      { path: 'teacher-notes/:id', component: TeacherNotesComponent },
      { path: 'upload-notes', component: UploadNotesComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'ai', component: AiComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'theme', component: ThemeComponent }
    ]
  },
  { 
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'notes', component: NotesComponent },
      { path: 'teacher', component: TeacherComponent },
      { path: 'user-manager', component: UserManagerComponent },
      { path: 'settings', component: AdminSettingsComponent },
      { path: 'theme', component: AdminThemeComponent }
    ]
  }
];
