import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AiQuestionService {
  // Groq API Configuration from environment
  private readonly GROK_API_URL = environment.grokApi.url;
  private apiKey = environment.grokApi.key;

  constructor(private http: HttpClient) {}

  /**
   * Set the API key dynamically
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Generate questions using Groq API
   */
  async generateQuestions(content: string, count: number): Promise<string[]> {
    if (!this.apiKey || this.apiKey === 'xai-YOUR_API_KEY_HERE') {
      throw new Error('Please configure your Groq API key in the service.');
    }

    const prompt = this.buildPrompt(content, count);
    const requestBody = {
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator who creates insightful questions to test comprehension and critical thinking. Generate clear, specific questions based on the provided content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      stream: false,
      temperature: 0.7,
      max_tokens: 2000
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    try {
      const response = await firstValueFrom(
        this.http.post<GrokResponse>(this.GROK_API_URL, requestBody, { headers })
      );

      return this.parseQuestions(response, count);
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Build the prompt for question generation
   */
  private buildPrompt(content: string, count: number): string {
    return `Based on the following content, generate exactly ${count} thoughtful and relevant questions that test understanding of the material.

Requirements:
- Each question should be clear and specific
- Questions should cover different aspects of the content
- Mix of factual recall and conceptual understanding questions
- Format: One question per line, without numbering

Content:
${content}

Generate ${count} questions now:`;
  }

  /**
   * Parse questions from API response
   */
  private parseQuestions(response: GrokResponse, count: number): string[] {
    const generatedText = response.choices[0].message.content;
    
    const questions = generatedText
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .map(q => q.replace(/^\d+[\.\)]\s*/, '')) // Remove numbering
      .map(q => q.replace(/^[-*]\s*/, '')) // Remove bullet points
      .filter(q => q.length > 10) // Filter out very short lines
      .slice(0, count);

    if (questions.length === 0) {
      throw new Error('No questions were generated. Please try again.');
    }

    return questions;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any): Error {
    console.error('API Error Details:', error);
    
    if (error.status === 401) {
      return new Error('Invalid API key. Please check your Groq API configuration.');
    } else if (error.status === 429) {
      return new Error('API rate limit exceeded. Please try again in a few moments.');
    } else if (error.status === 400) {
      const errorMsg = error.error?.error?.message || 'Invalid request';
      return new Error(`Bad Request: ${errorMsg}`);
    } else if (error.status === 0) {
      return new Error('Network error. Please check your internet connection.');
    } else if (error.error?.error?.message) {
      return new Error(`API Error: ${error.error.error.message}`);
    } else {
      return new Error(`API Error: ${error.message || 'Failed to generate questions'}`);
    }
  }

  /**
   * Extract text from different file types
   */
  async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const content = e.target.result;

          if (file.type === 'text/plain') {
            resolve(content);
          } else if (file.type === 'application/pdf') {
            // For PDF files, extract text using pdf.js
            const text = await this.extractPDFText(content);
            resolve(text);
          } else if (
            file.type === 'application/msword' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ) {
            // For Word documents, extract text
            const text = this.extractDocText(content);
            resolve(text);
          } else {
            resolve(content);
          }
        } catch (error) {
          reject(new Error('Failed to extract text from file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * Extract text from PDF using pdf.js (loaded dynamically)
   */
  private async extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      // Dynamically import pdf.js only on client side
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      const cleanedText = fullText
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedText.length < 50) {
        throw new Error('Could not extract meaningful text from PDF. The file might be scanned or image-based.');
      }

      return cleanedText;
    } catch (error) {
      throw new Error('Failed to parse PDF file. Please ensure it contains readable text.');
    }
  }

  /**
   * Extract text from Word documents (simplified)
   * For production, use mammoth.js library
   */
  private extractDocText(content: string): string {
    // Simplified extraction
    // In production, use mammoth.js for proper DOCX parsing
    return content
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate file before processing
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.'
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 10MB limit.'
      };
    }

    return { valid: true };
  }
}
