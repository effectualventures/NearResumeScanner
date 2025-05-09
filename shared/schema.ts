import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define main resume session model
export const resumeSessions = pgTable("resume_sessions", {
  id: text("id").primaryKey(), // UUID for session
  originalFilename: text("original_filename").notNull(),
  originalText: text("original_text"), // Extracted text from original resume
  processedText: text("processed_text"), // Enhanced text after processing
  processedJson: text("processed_json"), // Resume as JSON structure
  originalFilePath: text("original_file_path"), // Path to original file
  processedPdfPath: text("processed_pdf_path"), // Path to generated PDF
  metadata: text("metadata"), // Additional metadata like detailed format preference
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // For cleanup after 24h
});

// Define chat messages model
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => resumeSessions.id),
  isUser: boolean("is_user").notNull(), // true if from user, false if from AI
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define insert schemas
export const insertResumeSessionSchema = createInsertSchema(resumeSessions);
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });

// Define types
export type ResumeSession = typeof resumeSessions.$inferSelect;
export type InsertResumeSession = typeof resumeSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Create a Resume typing for the processed JSON structure
export interface ResumeHeader {
  firstName: string;
  tagline: string;
  location: string;
  city?: string;
  country?: string;
}

export interface ResumeSkill {
  category: string;
  items: string[];
}

export interface ResumeBullet {
  text: string;
  metrics?: string[];
}

export interface ResumeExperience {
  company: string;
  location: string;
  title: string;
  startDate: string;
  endDate: string;
  bullets: ResumeBullet[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  location: string;
  year: string;
  additionalInfo?: string;
}

export interface Resume {
  header: ResumeHeader;
  summary: string;
  skills: ResumeSkill[];
  languageSkills?: ResumeSkill; // Added for separating skills from languages
  experience: ResumeExperience[];
  education: ResumeEducation[];
  additionalExperience?: string;
}
