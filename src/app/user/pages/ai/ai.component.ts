import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.css']
})
export class AiComponent {
  userMessage = '';
  messages: any[] = [
    { text: 'Hello! How can I assist you today?', sender: 'ai' }
  ];

  sendMessage() {
    if (this.userMessage.trim()) {
      this.messages.push({ text: this.userMessage, sender: 'user' });
      
      setTimeout(() => {
        this.messages.push({ 
          text: 'I received your message: "' + this.userMessage + '". How can I help you further?', 
          sender: 'ai' 
        });
      }, 1000);
      
      this.userMessage = '';
    }
  }
}
