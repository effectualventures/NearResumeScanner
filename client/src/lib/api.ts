import { apiRequest } from "./queryClient";
import { ChatMessage } from "@shared/schema";

// Type for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Resume processing types
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

/**
 * Upload and process a resume file
 * @param file The resume file to upload
 * @param detailedFormat Whether to use the detailed (two-page) format for 10+ years experience
 * @param useOpenAIValidation Whether to use OpenAI for additional validation (slower but better quality)
 */
export async function uploadResume(file: File, detailedFormat: boolean = false, useOpenAIValidation: boolean = true): Promise<ProcessingResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("detailedFormat", detailedFormat.toString());
  formData.append("useOpenAIValidation", useOpenAIValidation.toString());
  
  const response = await fetch("/api/convert", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to upload resume");
  }
  
  const result: ApiResponse<ProcessingResult> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "Failed to process resume");
  }
  
  return result.data;
}

/**
 * Send a chat message for resume adjustment
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<ChatResult> {
  const response = await apiRequest("POST", "/api/chat", {
    sessionId,
    message,
  });
  
  const result: ApiResponse<ChatResult> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "Failed to process chat message");
  }
  
  return result.data;
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/chat/${sessionId}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to get chat history");
  }
  
  const result: ApiResponse<ChatMessage[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "Failed to get chat history");
  }
  
  return result.data;
}

/**
 * Download the processed resume PDF
 */
export function downloadResume(sessionId: string): void {
  const downloadUrl = `/api/download/${sessionId}`;
  window.open(downloadUrl, "_blank");
}

/**
 * Process Luis's resume automatically
 */
export async function processLuisResume(): Promise<ProcessingResult> {
  const response = await apiRequest("POST", "/api/process-luis-resume", {});
  
  const result: ApiResponse<ProcessingResult> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "Failed to process resume");
  }
  
  return result.data;
}

/**
 * Get auto-generated feedback for a resume
 */
export async function getAutoFeedback(sessionId: string): Promise<string> {
  const response = await fetch(`/api/auto-feedback/${sessionId}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to get auto feedback");
  }
  
  const result: ApiResponse<{ feedback: string }> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "Failed to get auto feedback");
  }
  
  return result.data.feedback;
}

/**
 * Implement feedback on a resume
 */
export async function implementFeedback(
  sessionId: string, 
  feedback: string, 
  implementationPlan?: string
): Promise<{ newSessionId: string; pdfUrl: string }> {
  const response = await apiRequest("POST", "/api/implement-feedback", {
    sessionId,
    feedback,
    implementationPlan
  });
  
  const result: ApiResponse<{ newSessionId: string; pdfUrl: string }> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "Failed to implement feedback");
  }
  
  return result.data;
}
