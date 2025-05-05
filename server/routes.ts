import express, { type Express, Request, Response } from "express";
import multer from "multer";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseResumeFile } from "./parser";
import { transformResume, processChat } from "./openai";
import { generatePDF } from "./pdf-generator";
import { ApiResponse, ProcessingResult, ChatResult } from "./types";
import { Resume } from "@shared/schema";
import path from "path";
import fs from "fs";

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF and DOCX files
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and DOCX are supported."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up route for temporary file serving
  app.use("/temp", express.static(path.join(process.cwd(), "temp")));
  
  // File upload and processing route
  app.post(
    "/api/convert",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: { code: "NO_FILE", message: "No file uploaded" },
          });
        }
        
        // Parse the uploaded file
        const parsedFile = await parseResumeFile(
          req.file.buffer,
          req.file.originalname
        );
        
        // Create a hash of the extracted text to use as a cache key
        const textHash = Buffer.from(parsedFile.extractedText).toString('base64').slice(0, 10);
        const cachedFilePath = path.join(process.cwd(), 'temp', `cached_${textHash}.json`);
        
        let resumeData;
        let pdfPath;

        // Check if we have a cached version of this resume
        if (fs.existsSync(cachedFilePath)) {
          try {
            console.log(`Using cached resume data: ${cachedFilePath}`);
            const cachedData = fs.readFileSync(cachedFilePath, 'utf8');
            resumeData = JSON.parse(cachedData);
            
            // Generate PDF from the cached resume data
            pdfPath = await generatePDF(resumeData, parsedFile.id);
          } catch (cacheError) {
            console.error("Error reading cached resume:", cacheError);
            // If cache read fails, continue with normal processing
            resumeData = null;
          }
        }

        // If no cache was found or cache read failed, process with OpenAI
        if (!resumeData) {
          // Transform resume using OpenAI
          const transformResult = await transformResume(
            parsedFile.extractedText,
            parsedFile.id
          );
          
          if (!transformResult.success) {
            return res.status(500).json({
              success: false,
              error: {
                code: "PROCESSING_ERROR",
                message: transformResult.error || "Failed to process resume",
              },
            });
          }
          
          resumeData = transformResult.resume;
          
          // Cache the processed resume data
          try {
            fs.writeFileSync(cachedFilePath, JSON.stringify(resumeData));
            console.log(`Cached resume data saved: ${cachedFilePath}`);
          } catch (cacheError) {
            console.error("Error caching resume data:", cacheError);
            // Continue even if caching fails
          }
          
          // Generate PDF from the processed resume
          pdfPath = await generatePDF(resumeData, parsedFile.id);
        }
        
        // Store in the session
        await storage.createSession({
          id: parsedFile.id,
          originalFilename: parsedFile.originalFilename,
          originalText: parsedFile.extractedText,
          processedText: JSON.stringify(resumeData),
          processedJson: JSON.stringify(resumeData),
          originalFilePath: parsedFile.originalFilePath,
          processedPdfPath: pdfPath as string,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
        });
        
        // Add initial system message to chat
        await storage.addChatMessage({
          sessionId: parsedFile.id,
          isUser: false,
          message: "Hi there! I can help adjust this resume to make it even better. You can ask me to modify specific bullets, add achievements, rearrange sections, or adjust the summary."
        });
        
        // Return success with session info
        const response: ApiResponse<ProcessingResult> = {
          success: true,
          data: {
            sessionId: parsedFile.id,
            pdfUrl: `/temp/${path.basename(pdfPath as string)}`,
            originalFilename: parsedFile.originalFilename,
          },
        };
        
        return res.json(response);
      } catch (error: any) {
        console.error("Error in /api/convert:", error);
        return res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: error?.message || "An internal error occurred",
          },
        });
      }
    }
  );
  
  // Chat message processing
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Session ID and message are required",
          },
        });
      }
      
      // Retrieve session data
      const sessionData = await storage.getSession(sessionId);
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
        });
      }
      
      // Store user message
      await storage.addChatMessage({
        sessionId,
        isUser: true,
        message,
      });
      
      // Process the chat message with OpenAI
      const currentResume: Resume = JSON.parse(sessionData.processedJson);
      
      // Create a hash for chat request caching
      const chatKey = `${sessionId}_${Buffer.from(message).toString('base64').slice(0, 10)}`;
      const chatCachePath = path.join(process.cwd(), 'temp', `chat_${chatKey}.json`);
      
      let chatResult;
      
      // Check for cached chat result
      if (fs.existsSync(chatCachePath)) {
        try {
          console.log(`Using cached chat result: ${chatCachePath}`);
          const cachedData = fs.readFileSync(chatCachePath, 'utf8');
          chatResult = JSON.parse(cachedData);
        } catch (cacheError) {
          console.error("Error reading cached chat result:", cacheError);
          // If cache read fails, proceed with API call
          chatResult = null;
        }
      }
      
      // If no cache was found, process with OpenAI
      if (!chatResult) {
        chatResult = await processChat(sessionId, message, currentResume);
        
        // Cache the result
        try {
          fs.writeFileSync(chatCachePath, JSON.stringify(chatResult));
          console.log(`Cached chat result saved: ${chatCachePath}`);
        } catch (cacheError) {
          console.error("Error caching chat result:", cacheError);
          // Continue even if caching fails
        }
      }
      
      if (!chatResult.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: "CHAT_PROCESSING_ERROR",
            message: chatResult.error || "Failed to process chat message",
          },
        });
      }
      
      // Generate updated PDF
      const pdfPath = await generatePDF(
        chatResult.updatedResume,
        `${sessionId}-updated`
      );
      
      // Store AI response
      const aiResponse = `I've made the following changes:\n${chatResult.changes
        .map((c) => `- ${c.description}`)
        .join("\n")}`;
        
      await storage.addChatMessage({
        sessionId,
        isUser: false,
        message: aiResponse,
      });
      
      // Update session with new data
      await storage.updateSession(sessionId, {
        processedJson: JSON.stringify(chatResult.updatedResume),
        processedPdfPath: pdfPath,
      });
      
      // Return success with updated PDF URL
      const response: ApiResponse<ChatResult> = {
        success: true,
        data: {
          pdfUrl: `/temp/${path.basename(pdfPath)}`,
          changes: chatResult.changes,
        },
      };
      
      return res.json(response);
    } catch (error) {
      console.error("Error in /api/chat:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "An internal error occurred",
        },
      });
    }
  });
  
  // Get chat history
  app.get("/api/chat/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      // Validate session exists
      const sessionData = await storage.getSession(sessionId);
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
        });
      }
      
      // Get chat messages
      const messages = await storage.getChatMessages(sessionId);
      
      return res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error("Error in GET /api/chat/:sessionId:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "An internal error occurred",
        },
      });
    }
  });
  
  // Download route that sets proper headers
  app.get("/api/download/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      // Retrieve session data
      const sessionData = await storage.getSession(sessionId);
      if (!sessionData) {
        return res.status(404).json({
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
        });
      }
      
      // Determine which file to send (updated or original)
      const filePath = sessionData.processedPdfPath;
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: { code: "FILE_NOT_FOUND", message: "Resume file not found" },
        });
      }
      
      // Parse the resume JSON to extract role and country
      const resumeData: Resume = JSON.parse(sessionData.processedJson);
      const role = resumeData.header.tagline || "Resume";
      const country = resumeData.header.country || resumeData.header.location.split(",").pop()?.trim() || "International";
      const idSuffix = sessionId.substring(0, 4).toUpperCase();
      
      // Determine content type based on file extension
      const fileExt = path.extname(filePath).toLowerCase();
      let contentType = "application/octet-stream";
      let filenameSuffix = "pdf";
      
      if (fileExt === ".html") {
        contentType = "text/html";
        filenameSuffix = "html";
      } else if (fileExt === ".pdf") {
        contentType = "application/pdf";
        filenameSuffix = "pdf";
      }
      
      // Use a simple ASCII filename to avoid encoding issues
      const simpleFilename = `resume-${idSuffix}.${filenameSuffix}`;
      
      // Set headers for download with a simple filename
      res.setHeader("Content-Disposition", `attachment; filename=${simpleFilename}`);
      res.setHeader("Content-Type", contentType);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error in /api/download:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "An internal error occurred",
        },
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
