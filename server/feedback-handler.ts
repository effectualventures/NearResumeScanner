import { Resume } from '@shared/schema';
import { transformResume, processChat, processDirectFeedback } from './openai';
import { storage } from './storage';
import { generatePDF } from './pdf-generator';
import crypto from 'crypto';

interface FeedbackImplementationRequest {
  sessionId: string;
  feedback: string;
  implementationPlan?: string;
}

interface FeedbackImplementationResult {
  success: boolean;
  newSessionId?: string;
  pdfUrl?: string;
  error?: string;
}

/**
 * Implement feedback for a processed resume
 * This function processes ChatGPT feedback and applies it to a resume
 */
export async function implementFeedback(
  data: FeedbackImplementationRequest
): Promise<FeedbackImplementationResult> {
  try {
    // Get the existing session data
    const session = await storage.getSession(data.sessionId);
    if (!session) {
      return { 
        success: false, 
        error: 'Session not found' 
      };
    }
    
    // Get the current resume data
    const processedJson = session.processedJson || '{}';
    const currentResume: Resume = JSON.parse(processedJson);
    
    // Process the feedback and update the resume
    const chatResult = await processDirectFeedback(
      data.feedback, 
      data.implementationPlan || '',
      currentResume
    );
    
    if (!chatResult.success) {
      return { 
        success: false, 
        error: chatResult.error || 'Failed to process feedback' 
      };
    }
    
    // Generate a new PDF/HTML with the updated resume
    const newSessionId = crypto.randomUUID();
    const pdfPath = await generatePDF(chatResult.updatedResume, newSessionId);
    
    // Save the new session
    await storage.createSession({
      id: newSessionId,
      originalFilename: session.originalFilename,
      originalFilePath: session.originalFilePath,
      originalText: session.originalText,
      processedText: session.processedText,
      processedJson: JSON.stringify(chatResult.updatedResume),
      processedPdfPath: pdfPath,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
    });
    
    // Return the result
    return {
      success: true,
      newSessionId,
      pdfUrl: pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`
    };
  } catch (error) {
    console.error('Error implementing feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}