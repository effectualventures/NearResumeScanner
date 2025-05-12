import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const PDF_FILE_PATH = path.join(__dirname, 'Luis Chavez - Sr BDR - Player Coach (Near).pdf');
const OUTPUT_DIR = path.join(__dirname, 'temp');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function uploadAndProcessResume() {
  try {
    console.log('Step 1: Uploading and processing resume...');
    
    // Create form data with file
    const formData = new FormData();
    formData.append('file', fs.createReadStream(PDF_FILE_PATH));
    formData.append('skipValidation', 'true'); // Skip OpenAI validation for faster processing
    formData.append('detailedFormat', 'false'); // Use standard format, not detailed

    // Upload the file using v2 API
    const response = await fetch(`${API_BASE_URL}/v2/convert`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Failed to upload and process the resume: ' + JSON.stringify(result.error));
    }
    
    console.log('Resume processed successfully!');
    console.log('Session ID:', result.data.sessionId);
    
    return result.data.sessionId;
  } catch (error) {
    console.error('Error during upload and processing:', error);
    throw error;
  }
}

async function downloadProcessedResume(sessionId) {
  try {
    console.log('Step 2: Downloading processed resume...');
    
    const response = await fetch(`${API_BASE_URL}/v2/download/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const outputPath = path.join(OUTPUT_DIR, `processed_${Date.now()}.pdf`);
    const fileStream = fs.createWriteStream(outputPath);
    
    // Pipe the PDF data to a file
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });
    
    console.log(`PDF downloaded successfully to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error during download:', error);
    throw error;
  }
}

// Main function to run the entire process
async function testMetricDeduplication() {
  try {
    console.log('=======================================');
    console.log('Starting Metric Deduplication Test');
    console.log('=======================================');
    
    // Step 1: Upload and process the resume
    const sessionId = await uploadAndProcessResume();
    
    // Step 2: Download the processed resume
    const pdfPath = await downloadProcessedResume(sessionId);
    
    console.log('=======================================');
    console.log('Test completed successfully!');
    console.log(`Please check ${pdfPath} to verify metrics are properly deduplicated`);
    console.log('=======================================');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMetricDeduplication();