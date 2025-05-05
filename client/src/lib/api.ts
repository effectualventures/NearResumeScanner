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
 */
export async function uploadResume(file: File): Promise<ProcessingResult> {
  const formData = new FormData();
  formData.append("file", file);
  
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
