import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { NotesComponent } from './pages/notes/notes.component';
import { TeacherComponent } from './pages/teacher/teacher.component';
import { UserManagerComponent } from './pages/manage-users/user-manager/user-manager.component';
import { AdminSettingsComponent } from './pages/settings/settings.component';
import { AdminThemeComponent } from './pages/theme/theme.component';

const routes: Routes = [
  {
    path: '',
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
