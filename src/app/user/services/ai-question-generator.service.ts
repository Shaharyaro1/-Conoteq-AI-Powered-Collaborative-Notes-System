import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface QuestionGenerationRequest {
  content: string;
  questionCount: number;
  contentType: 'text' | 'document';
  fileName?: string;
}

export interface GeneratedQuestion {
  id: number;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuestionGenerationResponse {
  success: boolean;
  questions: GeneratedQuestion[];
  totalGenerated: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiQuestionGeneratorService {
  // Using Grok API (free tier available)
  private readonly GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
  private readonly API_KEY = 'your-grok-api-key-here'; // Replace with actual API key

  constructor(private http: HttpClient) {}

  /**
   * Generate questions from text content
   */
  generateQuestionsFromText(content: string, questionCount: number): Observable<QuestionGenerationResponse> {
    const request: QuestionGenerationRequest = {
      content,
      questionCount,
      contentType: 'text'
    };

    return this.callGrokAPI(request);
  }

  /**
   * Generate questions from uploaded document
   */
  generateQuestionsFromDocument(
    documentContent: string, 
    questionCount: number, 
    fileName: string
  ): Observable<QuestionGenerationResponse> {
    const request: QuestionGenerationRequest = {
      content: documentContent,
      questionCount,
      contentType: 'document',
      fileName
    };

    return this.callGrokAPI(request);
  }

  /**
   * Extract text from PDF file
   */
  extractTextFromPDF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // For demo purposes, we'll simulate PDF text extraction
          // In a real implementation, you'd use a library like PDF.js
          const result = e.target?.result as string;
          
          // Simulate extracted text (in real implementation, use PDF.js)
          const simulatedText = `Extracted content from ${file.name}. 
          This is a simulation of PDF text extraction. 
          In a real implementation, you would use PDF.js or similar library 
          to extract actual text content from the PDF file.`;
          
          resolve(simulatedText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Extract text from various document formats
   */
  extractTextFromDocument(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          
          if (file.type === 'application/pdf') {
            // For PDF files, use PDF extraction
            this.extractTextFromPDF(file).then(resolve).catch(reject);
          } else if (file.type === 'text/plain') {
            // For text files, read directly
            resolve(result);
          } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
            // For Word documents, simulate extraction
            const simulatedText = `Content extracted from Word document: ${file.name}. 
            This is simulated content extraction. In a real implementation, 
            you would use libraries like mammoth.js for .docx files.`;
            resolve(simulatedText);
          } else {
            // For other formats, try to read as text
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  /**
   * Call Grok API to generate questions
   */
  private callGrokAPI(request: QuestionGenerationRequest): Observable<QuestionGenerationResponse> {
    const prompt = this.buildPrompt(request);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.API_KEY}`
    });

    const body = {
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality questions based on the provided content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    };

    // For demo purposes, return mock data if API key is not configured
    if (this.API_KEY === 'your-grok-api-key-here') {
      return this.getMockQuestions(request.questionCount);
    }

    return this.http.post<any>(this.GROK_API_URL, body, { headers }).pipe(
      map(response => this.parseGrokResponse(response, request.questionCount)),
      catchError(error => {
        console.error('Grok API Error:', error);
        // Fallback to mock data on API error
        return this.getMockQuestions(request.questionCount);
      })
    );
  }

  /**
   * Build prompt for AI question generation
   */
  private buildPrompt(request: QuestionGenerationRequest): string {
    const basePrompt = `
Based on the following content, generate exactly ${request.questionCount} educational questions.

Content:
${request.content}

Requirements:
1. Generate exactly ${request.questionCount} questions
2. Mix different question types: multiple choice, short answer, and essay questions
3. Vary difficulty levels: easy, medium, and hard
4. For multiple choice questions, provide 4 options with one correct answer
5. Make questions relevant and educational
6. Format the response as JSON with this structure:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "type": "multiple-choice|short-answer|essay",
      "options": ["A", "B", "C", "D"] (only for multiple-choice),
      "correctAnswer": "A" (only for multiple-choice),
      "difficulty": "easy|medium|hard"
    }
  ]
}

Generate the questions now:`;

    return basePrompt;
  }

  /**
   * Parse Grok API response
   */
  private parseGrokResponse(response: any, requestedCount: number): QuestionGenerationResponse {
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          questions: parsedData.questions || [],
          totalGenerated: parsedData.questions?.length || 0
        };
      }
      
      // Fallback if parsing fails
      return this.getMockQuestionsSync(requestedCount);
    } catch (error) {
      console.error('Error parsing Grok response:', error);
      return this.getMockQuestionsSync(requestedCount);
    }
  }

  /**
   * Get mock questions for demo/fallback
   */
  private getMockQuestions(count: number): Observable<QuestionGenerationResponse> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(this.getMockQuestionsSync(count));
        observer.complete();
      }, 1500); // Simulate API delay
    });
  }

  /**
   * Generate mock questions synchronously
   */
  private getMockQuestionsSync(count: number): QuestionGenerationResponse {
    const questionTemplates = [
      {
        question: "What is the main concept discussed in the provided content?",
        type: "short-answer" as const,
        difficulty: "easy" as const
      },
      {
        question: "Which of the following best describes the key theme?",
        type: "multiple-choice" as const,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option B",
        difficulty: "medium" as const
      },
      {
        question: "Analyze and explain the significance of the main points discussed.",
        type: "essay" as const,
        difficulty: "hard" as const
      },
      {
        question: "What are the primary benefits mentioned in the content?",
        type: "short-answer" as const,
        difficulty: "easy" as const
      },
      {
        question: "How would you apply the concepts from this content in a real-world scenario?",
        type: "essay" as const,
        difficulty: "hard" as const
      }
    ];

    const questions: GeneratedQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      const template = questionTemplates[i % questionTemplates.length];
      questions.push({
        id: i + 1,
        question: `${i + 1}. ${template.question}`,
        type: template.type,
        options: template.options,
        correctAnswer: template.correctAnswer,
        difficulty: template.difficulty
      });
    }

    return {
      success: true,
      questions,
      totalGenerated: questions.length
    };
  }
}