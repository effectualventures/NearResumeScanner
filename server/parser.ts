import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { FileUploadResult } from './types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export async function parseResumeFile(
  buffer: Buffer, 
  filename: string
): Promise<FileUploadResult> {
  const fileExt = path.extname(filename).toLowerCase();
  let extractedText = '';
  
  try {
    // Extract text based on file type
    if (fileExt === '.pdf') {
      extractedText = await extractTextFromPDF(buffer);
    } else if (fileExt === '.docx') {
      extractedText = await extractTextFromDOCX(buffer);
    } else {
      throw new Error(`Unsupported file format: ${fileExt}`);
    }
    
    // Generate session ID
    const sessionId = uuidv4();
    
    // For v2, we don't save files to storage - process directly
    const filePath = `temp/${sessionId}_${filename}`;
    
    return {
      id: sessionId,
      originalFilename: filename,
      originalFilePath: filePath,
      extractedText
    };
  } catch (error) {
    console.error('Error parsing resume file:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    
    // If the parsed text is too small, it might be a scanned image PDF
    if (data.text.trim().length < 100) {
      console.log('PDF appears to be scanned. Attempting OCR...');
      return await performOCR(buffer);
    }
    
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
}

async function performOCR(buffer: Buffer): Promise<string> {
  try {
    // Convert buffer to base64 for Tesseract
    const base64Data = buffer.toString('base64');
    
    const result = await Tesseract.recognize(
      `data:application/pdf;base64,${base64Data}`,
      'eng',
      {
        logger: m => console.log(m),
      }
    );
    
    // Check confidence score
    if (result.data.confidence < 80) {
      throw new Error('OCR confidence too low. Please try a different file or convert it to text first.');
    }
    
    return result.data.text;
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw new Error('OCR processing failed. Please try a different file format.');
  }
}
