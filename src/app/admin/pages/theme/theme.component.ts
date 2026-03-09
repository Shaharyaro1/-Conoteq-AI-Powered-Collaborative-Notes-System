import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-theme',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './theme.component.html',
  styleUrls: ['./theme.component.css']
})
export class AdminThemeComponent {
  isDarkMode = false;

  toggleTheme() {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }
}
