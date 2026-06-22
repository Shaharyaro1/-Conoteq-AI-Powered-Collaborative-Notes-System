import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiQuestionService } from '../../services/ai-question.service';

@Component({
  selector: 'app-ai',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.css']
})
export class AiComponent {
  // Input modes
  inputMode: 'text' | 'file' = 'text';
  
  // Text input
  textContent = '';
  
  // File upload
  selectedFile: File | null = null;
  isDragging = false;
  fileError = '';
  
  // Question generation
  questionCounts = [5, 10, 15];
  selectedQuestionCount = 5;
  generatedQuestions: string[] = [];
  isGenerating = false;
  generationError = '';
  
  constructor(private aiService: AiQuestionService) {}
  
  // File handling methods
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.handleFile(file);
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }
  
  handleFile(file: File): void {
    this.fileError = '';
    
    const validation = this.aiService.validateFile(file);
    if (!validation.valid) {
      this.fileError = validation.error || 'Invalid file';
      return;
    }
    
    this.selectedFile = file;
  }
  
  removeFile(): void {
    this.selectedFile = null;
    this.fileError = '';
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  // Question generation
  canGenerate(): boolean {
    if (this.inputMode === 'text') {
      return this.textContent.trim().length > 0;
    } else {
      return this.selectedFile !== null;
    }
  }
  
  async generateQuestions(): Promise<void> {
    this.isGenerating = true;
    this.generationError = '';
    this.generatedQuestions = [];
    
    try {
      let content = '';
      
      if (this.inputMode === 'text') {
        content = this.textContent;
      } else if (this.selectedFile) {
        content = await this.aiService.extractTextFromFile(this.selectedFile);
      }
      
      if (!content.trim()) {
        throw new Error('No content to process');
      }
      
      // Limit content length to avoid API issues
      const maxLength = 8000;
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
      }
      
      // Call AI service to generate questions
      const questions = await this.aiService.generateQuestions(content, this.selectedQuestionCount);
      this.generatedQuestions = questions;
      
    } catch (error: any) {
      this.generationError = error.message || 'Failed to generate questions. Please try again.';
      console.error('Error generating questions:', error);
    } finally {
      this.isGenerating = false;
    }
  }
  
  // Utility methods
  copyQuestion(question: string): void {
    navigator.clipboard.writeText(question).then(() => {
      console.log('Question copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy question:', err);
    });
  }
  
  copyAllQuestions(): void {
    const allQuestions = this.generatedQuestions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(allQuestions).then(() => {
      console.log('All questions copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy questions:', err);
    });
  }
}
