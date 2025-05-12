import express, { Request, Response, NextFunction, Express } from 'express';
import { parseResumeFile } from './parser';
import { transformResume, generateFeedback, processDirectFeedback, processChat } from './openai';
import { enhanceResumeText } from './text-processor-v2';
import { generatePDFv2 } from './pdf-generator-v2';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'http';
import { CHATGPT_FEEDBACK_PROMPT } from './feedback-prompt';
import { implementFeedback } from './feedback-handler';
import { Resume } from '../shared/schema';
import { UploadedFile } from 'express-fileupload';

// In-memory session storage
interface SessionData {
  originalText: string;
  processedJson: string;
  feedbackChat?: string[];
  enhancedFormat?: boolean;
}

// Session storage
const sessions: Record<string, SessionData> = {};

/**
 * Register enhanced v2 routes for the application
 */
export async function registerV2Routes(app: Express): Promise<void> {
  // Upload and process a resume (v2)
  app.post("/api/v2/convert", async (req: Request, res: Response) => {
    try {
      // Handle resume file upload
      if (!req.files || !req.files.resume) {
        return res.status(400).json({
          success: false,
          error: "No resume file provided"
        });
      }
      
      const resumeFile = Array.isArray(req.files.resume) 
        ? req.files.resume[0] as UploadedFile 
        : req.files.resume as UploadedFile;
        
      const enhancedFormat = req.body.enhancedFormat === 'true';
      
      // Generate a unique session ID
      const sessionId = generateSessionId();
      
      // First, extract text from the uploaded file
      console.log(`Processing file: ${resumeFile.name} (${resumeFile.size} bytes)`);
      const resumeText = await parseResumeFile(resumeFile.data as Buffer, resumeFile.name);
      
      // Then, transform the resume using OpenAI
      console.log("Calling OpenAI to transform resume...");
      const processedResume = await transformResume(resumeText as string, enhancedFormat) as unknown as Resume;
      
      // Apply enhanced text processing
      console.log("Applying enhanced text processing (v2)...");
      const enhancedResume = enhanceResumeText(processedResume);
      
      // Store session data
      sessions[sessionId] = {
        originalText: resumeText,
        processedJson: JSON.stringify(enhancedResume),
        enhancedFormat
      };
      
      // Generate PDF using the improved generator
      console.log("Generating enhanced PDF (v2)...");
      const pdfPath = await generatePDFv2(enhancedResume, sessionId, enhancedFormat);
      
      // Determine if we have HTML or PDF
      const isPdf = pdfPath.endsWith('.pdf');
      const fileUrl = `/api/v2/download/${sessionId}`;
      
      // Return success response
      return res.json({
        success: true,
        data: {
          sessionId,
          pdfUrl: fileUrl,
          format: isPdf ? 'pdf' : 'html'
        }
      });
    } catch (error: any) {
      console.error("Error processing resume:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred"
      });
    }
  });
  
  // Generate chat feedback (v2)
  app.post("/api/v2/chat", async (req: Request, res: Response) => {
    try {
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          error: "Session ID and message are required"
        });
      }
      
      // Check if session exists
      const sessionData = sessions[sessionId];
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          error: "Session not found"
        });
      }
      
      // Parse the resume from session
      const currentResume = JSON.parse(sessionData.processedJson);
      
      // Initialize chat history if not exists
      if (!sessionData.feedbackChat) {
        sessionData.feedbackChat = [];
      }
      
      // Add user message to chat history
      sessionData.feedbackChat.push(`User: ${message}`);
      
      // Process the chat message
      const response = await processChat(message, currentResume as unknown as Resume, sessionData.feedbackChat);
      
      // Add assistant response to chat history
      sessionData.feedbackChat.push(`Assistant: ${response}`);
      
      // Return the response
      return res.json({
        success: true,
        data: {
          message: response,
          sessionId
        }
      });
    } catch (error: any) {
      console.error("Error in chat:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred"
      });
    }
  });
  
  // Get chat history (v2)
  app.get("/api/v2/chat/:sessionId", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    
    // Check if session exists
    const sessionData = sessions[sessionId];
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: "Session not found"
      });
    }
    
    // Return chat history or empty array
    return res.json({
      success: true,
      data: {
        chat: sessionData.feedbackChat || [],
        sessionId
      }
    });
  });
  
  // Download processed resume (v2)
  app.get("/api/v2/download/:sessionId", (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      // Check if session exists
      const sessionData = sessions[sessionId];
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          error: "Session not found"
        });
      }
      
      // Parse resume data
      const resumeData = JSON.parse(sessionData.processedJson);
      
      // Path to PDF file
      const pdfPath = path.join(process.cwd(), 'temp', `${sessionId}_v2.pdf`);
      const htmlPath = path.join(process.cwd(), 'temp', `${sessionId}_v2.html`);
      
      // Check if PDF exists
      if (fs.existsSync(pdfPath)) {
        // Set headers and send PDF
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${resumeData.header?.firstName || 'resume'}.pdf"`);
        return res.sendFile(pdfPath);
      } 
      // Check if HTML exists
      else if (fs.existsSync(htmlPath)) {
        // Set headers and send HTML
        res.set('Content-Type', 'text/html');
        res.set('Content-Disposition', `attachment; filename="${resumeData.header?.firstName || 'resume'}.html"`);
        return res.sendFile(htmlPath);
      }
      
      // Neither PDF nor HTML exists
      return res.status(404).json({
        success: false,
        error: "Resume file not found"
      });
    } catch (error: any) {
      console.error("Error downloading resume:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred"
      });
    }
  });
  
  // Generate automatic feedback (v2)
  app.get('/api/v2/auto-feedback/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      // Check if session exists
      const sessionData = sessions[sessionId];
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          error: "Session not found"
        });
      }
      
      // Parse resume data
      const resumeData = JSON.parse(sessionData.processedJson);
      
      // Generate feedback using OpenAI
      console.log("Generating auto-feedback for resume...");
      const feedback = await generateFeedback(resumeData, sessionData.originalText);
      
      return res.json({
        success: true,
        data: {
          feedback,
          sessionId
        }
      });
    } catch (error: any) {
      console.error("Error generating auto-feedback:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred"
      });
    }
  });
  
  // Implement feedback (v2)
  app.post('/api/v2/implement-feedback', async (req: Request, res: Response) => {
    try {
      const { sessionId, feedback, implementationPlan } = req.body;
      
      // Validate inputs
      if (!sessionId || !feedback) {
        return res.status(400).json({
          success: false,
          error: "Session ID and feedback are required"
        });
      }
      
      // Implement feedback
      const result = await implementFeedback({
        sessionId,
        feedback,
        implementationPlan
      });
      
      // If we have a new session ID, make sure to apply v2 enhancements
      if (result.success && result.newSessionId && sessions[result.newSessionId]) {
        const sessionData = sessions[result.newSessionId];
        const resume = JSON.parse(sessionData.processedJson);
        
        // Apply enhanced text processing
        console.log("Applying enhanced text processing to feedback implementation...");
        const enhancedResume = enhanceResumeText(resume);
        
        // Update session data
        sessionData.processedJson = JSON.stringify(enhancedResume);
        
        // Generate enhanced PDF
        console.log("Generating enhanced PDF for feedback implementation...");
        const enhancedFormat = sessionData.enhancedFormat || false;
        await generatePDFv2(enhancedResume, result.newSessionId, enhancedFormat);
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("Error implementing feedback:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An unknown error occurred"
      });
    }
  });
  
  console.log("Enhanced v2 routes registered");
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}