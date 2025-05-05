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
        
        // Generate PDF from the processed resume
        const pdfPath = await generatePDF(transformResult.resume, parsedFile.id);
        
        // Store in the session
        await storage.createSession({
          id: parsedFile.id,
          originalFilename: parsedFile.originalFilename,
          originalText: parsedFile.extractedText,
          processedText: JSON.stringify(transformResult.resume),
          processedJson: JSON.stringify(transformResult.resume),
          originalFilePath: parsedFile.originalFilePath,
          processedPdfPath: pdfPath,
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
            pdfUrl: `/temp/${path.basename(pdfPath)}`,
            originalFilename: parsedFile.originalFilename,
          },
        };
        
        return res.json(response);
      } catch (error) {
        console.error("Error in /api/convert:", error);
        return res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: error.message || "An internal error occurred",
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
      const chatResult = await processChat(sessionId, message, currentResume);
      
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
      
      // Determine which PDF to send (updated or original)
      const pdfPath = sessionData.processedPdfPath;
      
      if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({
          success: false,
          error: { code: "FILE_NOT_FOUND", message: "PDF file not found" },
        });
      }
      
      // Parse the resume JSON to extract role and country
      const resumeData: Resume = JSON.parse(sessionData.processedJson);
      const role = resumeData.header.tagline || "Resume";
      const country = resumeData.header.country || resumeData.header.location.split(",").pop()?.trim() || "International";
      const idSuffix = sessionId.substring(0, 4).toUpperCase();
      
      // Generate filename in required format: "Role (Country) – C-XXXX.pdf"
      const filename = `${role} (${country}) – C-${idSuffix}.pdf`;
      
      // Set headers for download
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/pdf");
      
      // Stream the file
      const fileStream = fs.createReadStream(pdfPath);
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
