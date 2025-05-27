import express, { Request, Response, NextFunction, Express } from 'express';
// Parser functionality moved inline
import { transformResume, generateFeedback, processDirectFeedback, processChat } from './openai';

import { generatePDFv2, registerHandlebarsHelpers } from './pdf-generator-v2';
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'http';

import { Resume } from '../shared/schema';
import { UploadedFile } from 'express-fileupload';

// In-memory session storage
interface SessionData {
  originalText: string;
  processedJson: string;
  feedbackChat?: string[];
  enhancedFormat?: boolean;
  includeAdditionalExp?: boolean;
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
      const includeAdditionalExp = req.body.includeAdditionalExp === 'true';
      
      // Generate a unique session ID
      const sessionId = generateSessionId();
      
      // First, extract text from the uploaded file
      console.log(`Processing file: ${resumeFile.name} (${resumeFile.size} bytes)`);
      // Cast to unknown first for type safety
      const resumeTextResult = await parseResumeFile(resumeFile.data as Buffer, resumeFile.name);
      
      // Then, transform the resume using OpenAI
      console.log("Calling OpenAI to transform resume...");
      
      // Make sure resumeTextResult is properly converted to string before passing to transformResume
      const textContent = typeof resumeTextResult === 'string' 
          ? resumeTextResult 
          : (resumeTextResult as any).text || JSON.stringify(resumeTextResult);
          
      console.log(`Resume text type: ${typeof textContent}, length: ${textContent.length} chars`);
          
      // Pass all parameters to transformResume
      const resumeTransformationResult = await transformResume(
        textContent, 
        sessionId, 
        enhancedFormat,
        includeAdditionalExp
      );
      
      // Debug resume transformation result
      console.log("Resume transformation result structure:", Object.keys(resumeTransformationResult));
      console.log("Resume transformation success:", resumeTransformationResult.success);
      
      if (!resumeTransformationResult.success) {
        console.error("Resume transformation failed:", resumeTransformationResult.error);
        return res.status(500).json({
          success: false,
          error: resumeTransformationResult.error || "Failed to transform resume"
        });
      }
      
      // Extract the resume data from the transformation result
      // The transformResume function returns an object with { success, resume } structure
      console.log("Resume transformation result type:", typeof resumeTransformationResult);
      console.log("Resume transformation result keys:", Object.keys(resumeTransformationResult).join(', '));
      
      // Getting the actual resume data
      const processedResume = resumeTransformationResult.resume;
      
      // Extensive logging for debugging
      console.log("Resume data structure validation:", 
                 processedResume && typeof processedResume === 'object' ? 'Valid object' : 'Invalid structure');
                 
      // Write the resume data to a debug file for inspection
      const debugFilePath = path.resolve(process.cwd(), 'temp', `processed-resume-debug-${sessionId}.json`);
      fs.writeFileSync(debugFilePath, JSON.stringify(processedResume, null, 2));
      console.log(`Debug file written: ${debugFilePath}`);
      
      // Debug the extracted resume data
      console.log("Processed resume structure:", 
        processedResume ? 
        `Object with properties: ${Object.keys(processedResume).join(", ")}` : 
        "No resume data found");
      
      if (!processedResume || !processedResume.header) {
        console.error("Invalid resume data structure after transformation");
        return res.status(500).json({
          success: false,
          error: "Invalid resume data structure generated"
        });
      }
      
      // Apply enhanced text processing
      console.log("Applying enhanced text processing (v2)...");
      const enhancedResume = processedResume;
      
      // Store session data
      sessions[sessionId] = {
        originalText: textContent, // Already sanitized the text above
        processedJson: JSON.stringify(enhancedResume),
        enhancedFormat,
        includeAdditionalExp
      };
      
      // Generate PDF using the improved generator
      console.log("Generating enhanced PDF (v2)...");
      const pdfPath = await generatePDFv2(enhancedResume, sessionId, enhancedFormat, includeAdditionalExp);
      
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
      // The correct parameter order for processChat is: sessionId, message, currentResume
      const response = await processChat(sessionId, message, currentResume as unknown as Resume);
      
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
      
      // Simple feedback implementation (simplified structure)
      const result = {
        success: false,
        error: "Feedback implementation temporarily disabled during cleanup"
      };
      
      // If we have a new session ID, make sure to apply v2 enhancements
      if (result.success && result.newSessionId && sessions[result.newSessionId]) {
        const sessionData = sessions[result.newSessionId];
        const resume = JSON.parse(sessionData.processedJson);
        
        // Apply enhanced text processing
        console.log("Applying enhanced text processing to feedback implementation...");
        const enhancedResume = resume;
        
        // Update session data
        sessionData.processedJson = JSON.stringify(enhancedResume);
        
        // Generate enhanced PDF
        console.log("Generating enhanced PDF for feedback implementation...");
        const enhancedFormat = sessionData.enhancedFormat || false;
        const includeAdditionalExp = sessionData.includeAdditionalExp !== false; // Default to true if not specified
        await generatePDFv2(enhancedResume, result.newSessionId, enhancedFormat, includeAdditionalExp);
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
  
  // Debug endpoint to test PDF generation with sample data
  app.get('/api/v2/debug/pdf', async (req: Request, res: Response) => {
    try {
      // Sample session ID for testing
      const testSessionId = 'debug-test-' + Date.now();
      
      // Create a sample template data structure (same as template debug)
      const sampleData = {
        header: {
          firstName: "Sample Name",
          tagline: "Senior Professional",
          location: "United States"
        },
        summary: "Experienced professional with a proven track record of success.",
        skills: [
          {
            category: "Skills",
            items: ["Project Management", "Leadership", "Strategy"]
          },
          {
            category: "Languages",
            items: ["English (Fluent)", "Spanish (Intermediate)"]
          }
        ],
        experience: [
          {
            company: "Sample Company",
            title: "Senior Manager",
            location: "New York",
            startDate: "Jan 2020",
            endDate: "Present",
            bullets: [
              {
                text: "Led team of 10 professionals to deliver key projects.",
                metrics: ["Increased revenue by 30%", "$5M in cost savings"]
              },
              {
                text: "Implemented new processes that improved efficiency.",
                metrics: ["Reduced cycle time by 25%"]
              }
            ]
          }
        ],
        education: [
          {
            institution: "Sample University",
            degree: "Bachelor of Science",
            location: "California",
            year: "2015"
          }
        ],
        additionalExperience: "Volunteer work with local community organizations."
      };
      
      // Generate a PDF with our sample data
      console.log('Testing PDF generation with sample data');
      const pdfPath = await generatePDFv2(sampleData as Resume, testSessionId, false, true);
      
      // Send PDF as download
      res.download(pdfPath, 'sample-resume.pdf', (err) => {
        if (err) {
          console.error('Error sending PDF:', err);
          res.status(500).json({success: false, error: 'Failed to generate PDF'});
        }
      });
    } catch (error) {
      console.error('Error in debug PDF endpoint:', error);
      res.status(500).json({success: false, error: 'Failed to generate PDF'});
    }
  });
  
  // Debug endpoint to check template data structure
  app.get('/api/v2/debug/template', (req: Request, res: Response) => {
    try {
      // Create a sample template data structure
      const sampleData = {
        header: {
          firstName: "Sample Name",
          tagline: "Senior Professional",
          location: "United States"
        },
        summary: "Experienced professional with a proven track record of success.",
        skills: [
          {
            category: "Skills",
            items: ["Project Management", "Leadership", "Strategy"]
          },
          {
            category: "Languages",
            items: ["English (Fluent)", "Spanish (Intermediate)"]
          }
        ],
        experience: [
          {
            company: "Sample Company",
            title: "Senior Manager",
            location: "New York",
            startDate: "Jan 2020",
            endDate: "Present",
            bullets: [
              {
                text: "Led team of 10 professionals to deliver key projects.",
                metrics: ["Increased revenue by 30%", "$5M in cost savings"]
              },
              {
                text: "Implemented new processes that improved efficiency.",
                metrics: ["Reduced cycle time by 25%"]
              }
            ]
          }
        ],
        education: [
          {
            institution: "Sample University",
            degree: "Bachelor of Science",
            location: "California",
            year: "2015"
          }
        ],
        additionalExperience: "Volunteer work with local community organizations.",
        detailedFormat: false,
        logoPath: path.resolve(process.cwd(), 'public/images/near_logo.png')
      };
      
      // Render the template using the imports at the top of this file
      // Register all Handlebars helpers
      registerHandlebarsHelpers();
      
      // Read template
      const templatePath = path.resolve(process.cwd(), 'server/templates/resume_v2.html');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      
      // Compile template with sample data
      const template = Handlebars.compile(templateSource);
      const html = template(sampleData);
      
      // Send HTML response
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error in debug template endpoint:', error);
      res.status(500).json({ success: false, error: 'Failed to render template' });
    }
  });
  
  // Add a debug endpoint for testing the OpenAI transformation process
  app.get('/api/v2/debug/transform', async (req: Request, res: Response) => {
    try {
      // Sample resume text for testing
      const sampleText = `John Smith
Senior Software Engineer

SUMMARY
Experienced software engineer with 8 years of experience in full-stack development. 
Proficient in JavaScript, TypeScript, React, and Node.js.

EXPERIENCE
ABC Technologies, Senior Software Engineer
Jan 2020 - Present, San Francisco, CA
• Developed and maintained multiple web applications using React and Node.js
• Led a team of 5 developers, increasing productivity by 30%
• Implemented CI/CD pipelines reducing deployment time by 50%

XYZ Corp, Software Engineer
Mar 2017 - Dec 2019, Seattle, WA
• Built RESTful APIs using Express.js and MongoDB
• Collaborated with product managers to define feature requirements
• Refactored legacy codebase improving performance by 40%

EDUCATION
University of Washington, Computer Science
2016, Seattle, WA
Bachelor of Science, Computer Science

SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, Git, CI/CD, Agile
LANGUAGES
English (Fluent), Spanish (Intermediate)`;

      // Generate a unique test session ID
      const testSessionId = 'debug-transform-' + generateSessionId();
      console.log('Debug transform: Starting OpenAI transformation process with session ID:', testSessionId);
      
      // Call the transform resume function with all required parameters
      const transformResult = await transformResume(
        sampleText,
        testSessionId,
        false, // standard one-page format
        true   // use OpenAI validation
      );
      
      if (!transformResult.success || !transformResult.resume) {
        throw new Error('Resume transformation failed: ' + transformResult.error);
      }
      
      // Save the processed data for inspection
      const debugPath = path.resolve(process.cwd(), 'temp/transform_data_debug.json');
      fs.writeFileSync(debugPath, JSON.stringify(transformResult.resume, null, 2));
      
      console.log('Debug transform: Resume transformation complete, saved to', debugPath);
      
      // Now use this data to generate a PDF
      const pdfPath = await generatePDFv2(transformResult.resume, testSessionId, false);
      
      console.log('Debug transform: PDF generation complete, path:', pdfPath);
      
      // Send the processed data as JSON with PDF URL
      res.json({
        success: true,
        message: 'Resume transformation and PDF generation successful',
        pdfUrl: `/api/v2/download/${testSessionId}`,
        resumeData: transformResult.resume
      });
    } catch (error: any) {
      console.error('Error testing resume transformation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error testing resume transformation',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
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