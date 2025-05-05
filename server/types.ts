// Server-specific types

// File processing types
export interface FileUploadResult {
  id: string;
  originalFilename: string;
  originalFilePath: string;
  extractedText: string;
}

export interface ProcessingResult {
  sessionId: string;
  pdfUrl: string;
  originalFilename: string;
}

export interface ChatResult {
  pdfUrl: string;
  changes: {
    type: string;
    description: string;
  }[];
}

// OpenAI related types
export interface ResumeTransformationResponse {
  success: boolean;
  resume: any; // Resume structure from schema.ts
  error?: string;
}

export interface ChatProcessingResponse {
  success: boolean;
  updatedResume: any; // Updated resume structure
  changes: {
    type: string;
    description: string;
  }[];
  error?: string;
}

// Generic API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
