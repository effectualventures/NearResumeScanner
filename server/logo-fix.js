// Quick test script to view the actual path of the logo file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to locate the logo file using different paths
const possiblePaths = [
  './public/images/near_logo.png',
  '/home/runner/workspace/public/images/near_logo.png',
  '../public/images/near_logo.png',
  path.resolve('./public/images/near_logo.png'),
];

console.log('Current working directory:', process.cwd());

possiblePaths.forEach(logoPath => {
  try {
    const stats = fs.statSync(logoPath);
    console.log(`✅ Logo exists at: ${logoPath}`);
    console.log(`File size: ${stats.size} bytes`);

    // Read the file into base64 to confirm it's valid
    const fileData = fs.readFileSync(logoPath);
    const base64Data = fileData.toString('base64').substring(0, 30) + '...';
    console.log(`Base64 preview: ${base64Data}`);
  } catch (error) {
    console.log(`❌ Logo not found at: ${logoPath}`);
  }
});