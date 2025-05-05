/**
 * Simplified Resume Feedback Process
 * 
 * This script helps automate the process of:
 * 1. Uploading a resume file
 * 2. Processing it through the Near Format
 * 3. Downloading the processed resume as HTML
 * 4. Providing instructions for manual feedback via ChatGPT
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_URL = 'http://localhost:5000';
const RESUME_FILE_PATH = 'Luis Chavez - Sr BDR - Player Coach (Near).pdf';
const CHATGPT_PROMPT = `
what feedback would you have on this resume?

give the feedback as three different people:

1. CEO of company who is looking at the full picture -> they want a resume that WOWs clients. The CEO who is looking at the full picture of the resume, they want a resume that wows clients, that also looks very clean, and they're looking at every single detail extremely meticulously. They want to make sure that there's no spelling mistakes, no inconsistencies on the way stuff is written, nothing missing. For example, if we have a month and a year for one place and we don't have it another place, that needs to be fixed to make sure that there's bullets where there's supposed to be bullets, like an explanation of what they did in their education. Everything. Make sure there's no design mistakes. 

2. The second person is a designer who is looking at the design of it. Is it stretched out? Does it need to be more in a standard PDF resume format? Are there things that we need to add to the app to make sure that the end result is good? Is there weird logo stuff? Is the logo generated on the bottom right like it's supposed to be? All of the font colors, the sizes, everything in order. 

3. Then the third person is the salesperson who is looking to make sure that this is a presentable resume and is going to get the prospect to be excited about Near because they know that the talent quality that they get is going to be really good. They want to make sure that there's no exaggeration on the bullets, but they want to make sure that the bullets of the resume are not short so that it looks stupid and auto-generated. It should look like a real amazing U.S. resume.
`;

/**
 * Upload and process a resume file
 * @returns {Promise<{sessionId: string, pdfUrl: string}>}
 */
async function uploadAndProcessResume() {
  console.log('Uploading and processing resume...');
  
  // Create form data with the file
  const formData = new FormData();
  formData.append('file', fs.createReadStream(RESUME_FILE_PATH));
  
  try {
    // Upload the file
    const response = await fetch(`${SERVER_URL}/api/convert`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }
    
    console.log('Resume processed successfully!');
    console.log(`Session ID: ${data.data.sessionId}`);
    console.log(`PDF URL: ${data.data.pdfUrl}`);
    
    return {
      sessionId: data.data.sessionId,
      pdfUrl: data.data.pdfUrl
    };
  } catch (error) {
    console.error('Error uploading resume:', error);
    throw error;
  }
}

/**
 * Download the processed resume
 * @param {string} sessionId 
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadProcessedResume(sessionId) {
  console.log('Downloading processed resume...');
  
  const downloadUrl = `${SERVER_URL}/api/download/${sessionId}`;
  const outputPath = path.join(__dirname, 'processed_resume.pdf');
  
  try {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed with status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`Resume downloaded to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error downloading resume:', error);
    throw error;
  }
}

/**
 * Save the prompt to a file for easy copying
 */
function savePromptToFile() {
  const promptFilePath = path.join(__dirname, 'chatgpt_prompt.txt');
  fs.writeFileSync(promptFilePath, CHATGPT_PROMPT);
  console.log(`ChatGPT prompt saved to: ${promptFilePath}`);
  return promptFilePath;
}

/**
 * Run the automation
 */
async function run() {
  try {
    // Step 1: Upload and process the resume
    const { sessionId, pdfUrl } = await uploadAndProcessResume();
    
    // Step 2: Get the actual full path to the HTML resume
    const htmlResumeUrl = `${SERVER_URL}${pdfUrl}`;
    const htmlResumeLocalPath = path.join(__dirname, 'processed_resume.html');
    
    // Download the HTML resume file locally
    const response = await fetch(htmlResumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch HTML resume: ${response.status}`);
    }
    const htmlContent = await response.text();
    fs.writeFileSync(htmlResumeLocalPath, htmlContent);
    console.log(`HTML resume saved to: ${htmlResumeLocalPath}`);
    
    // Step 3: Save the prompt to a file
    const promptFilePath = savePromptToFile();
    
    // Step 4: Print instructions for manual feedback
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Open the processed resume in a browser: ');
    console.log(`   ${htmlResumeUrl}`);
    console.log('2. Take a screenshot of the resume');
    console.log('3. Upload the screenshot to ChatGPT');
    console.log('4. Use the prompt in the chatgpt_prompt.txt file');
    console.log('5. Share the feedback here to implement the changes');
    
  } catch (error) {
    console.error('Automation failed:', error);
  }
}

// Run the automation
run();