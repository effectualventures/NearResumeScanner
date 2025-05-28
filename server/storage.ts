import { 
  resumeSessions, 
  chatMessages, 
  type ResumeSession, 
  type InsertResumeSession,
  type ChatMessage,
  type InsertChatMessage,
  type Resume
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Modify the interface with CRUD methods needed for the app
export interface IStorage {
  // Session management
  createSession(session: InsertResumeSession): Promise<ResumeSession>;
  getSession(id: string): Promise<ResumeSession | undefined>;
  updateSession(id: string, data: Partial<InsertResumeSession>): Promise<ResumeSession | undefined>;
  deleteSession(id: string): Promise<boolean>;
  
  // Chat messages
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  
  // File management
  saveFile(buffer: Buffer, fileName: string): Promise<string>;
  getFilePath(id: string, isProcessed?: boolean): Promise<string | undefined>;
  cleanupExpiredSessions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, ResumeSession>;
  private messages: Map<string, ChatMessage[]>;
  private tempDir: string;
  
  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.tempDir = path.resolve(process.cwd(), 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Schedule cleanup
    this.scheduleCleanup();
  }
  
  async createSession(session: InsertResumeSession): Promise<ResumeSession> {
    const id = session.id || uuidv4();
    const newSession: ResumeSession = {
      ...session,
      id,
      createdAt: new Date(),
      expiresAt: session.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
    };
    
    this.sessions.set(id, newSession);
    return newSession;
  }
  
  async getSession(id: string): Promise<ResumeSession | undefined> {
    return this.sessions.get(id);
  }
  
  async updateSession(id: string, data: Partial<InsertResumeSession>): Promise<ResumeSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: ResumeSession = {
      ...session,
      ...data,
    };
    
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async deleteSession(id: string): Promise<boolean> {
    const deleted = this.sessions.delete(id);
    
    // Delete associated messages
    this.messages.delete(id);
    
    // Delete associated files
    const session = this.sessions.get(id);
    if (session) {
      if (session.originalFilePath && fs.existsSync(session.originalFilePath)) {
        fs.unlinkSync(session.originalFilePath);
      }
      if (session.processedPdfPath && fs.existsSync(session.processedPdfPath)) {
        fs.unlinkSync(session.processedPdfPath);
      }
    }
    
    return deleted;
  }
  
  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.getNextMessageId();
    const newMessage: ChatMessage = {
      ...message,
      id,
      createdAt: new Date(),
    };
    
    if (!this.messages.has(message.sessionId)) {
      this.messages.set(message.sessionId, []);
    }
    
    this.messages.get(message.sessionId)!.push(newMessage);
    return newMessage;
  }
  
  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messages.get(sessionId) || [];
  }
  
  async saveFile(buffer: Buffer, fileName: string): Promise<string> {
    const fileId = uuidv4();
    const ext = path.extname(fileName);
    const filePath = path.join(this.tempDir, `${fileId}${ext}`);
    
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
  
  async getFilePath(id: string, isProcessed = false): Promise<string | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    return isProcessed ? session.processedPdfPath : session.originalFilePath;
  }
  
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        await this.deleteSession(id);
      }
    }
  }
  
  private scheduleCleanup() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, 60 * 60 * 1000);
  }
  
  private getNextMessageId(): number {
    let maxId = 0;
    
    for (const messages of this.messages.values()) {
      for (const message of messages) {
        if (message.id > maxId) maxId = message.id;
      }
    }
    
    return maxId + 1;
  }
}

export const storage = new MemStorage();
