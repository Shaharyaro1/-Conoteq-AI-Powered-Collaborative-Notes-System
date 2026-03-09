import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-theme',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './theme.component.html',
  styleUrls: ['./theme.component.css']
})
export class ThemeComponent {
  isDarkMode = false;

  toggleTheme() {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }
}
