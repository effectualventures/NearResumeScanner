/**
 * Simple script to check if there is duplication of the "Presented by" text
 * in generated PDFs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the PDF file to check
const PDF_DIR = path.join(__dirname, 'temp');
const OUTPUT_FILE = path.join(__dirname, 'footer_check_results.txt');

/**
 * Find most recent PDF files in the temp directory
 */
function findRecentPDFs() {
  // Get all files in the temp directory
  const files = fs.readdirSync(PDF_DIR)
    .filter(f => f.endsWith('_v2.pdf'))
    .map(f => ({
      name: f,
      path: path.join(PDF_DIR, f),
      mtime: fs.statSync(path.join(PDF_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime); // Sort newest first
  
  // Return the 3 most recent files
  return files.slice(0, 3);
}

/**
 * Check PDF content for footer duplication
 */
async function checkPDFFooters() {
  console.log('Starting PDF footer duplication check...');
  
  const recentPDFs = findRecentPDFs();
  const results = [];
  
  if (recentPDFs.length === 0) {
    console.log('No PDF files found to check.');
    return;
  }
  
  console.log(`Found ${recentPDFs.length} recent PDF files to check:`);
  recentPDFs.forEach(pdf => console.log(`- ${pdf.name}`));
  
  // For each PDF, check if there is a duplicate "Presented by" text
  for (const pdf of recentPDFs) {
    console.log(`\nChecking ${pdf.name}...`);
    
    try {
      // Read the PDF file as binary data
      const pdfData = fs.readFileSync(pdf.path);
      
      // Convert to string for simple text search
      // This is a very basic approach - in a real implementation we would use a PDF parsing library
      const pdfString = pdfData.toString('utf8', 0, pdfData.length);
      
      // Check for "Presented by" text (case insensitive)
      const presentedByMatches = pdfString.match(/Presented\s+by/gi) || [];
      const presentedByCount = presentedByMatches.length;
      
      // Check for Near logo reference
      const logoMatches = pdfString.match(/Near\s+logo/gi) || [];
      const logoCount = logoMatches.length;
      
      // Determine if there's a footer by checking for image data
      const hasImageData = pdfString.includes('/Image') || pdfString.includes('/XObject');
      
      // Check if there are references to positioning elements at the bottom of page
      const hasFooterPositioning = pdfString.includes('0.35 inch') || 
                                 pdfString.includes('25.2 pt') ||
                                 pdfString.toLowerCase().includes('footer');
      
      // Determine if there's duplication
      const hasDuplication = presentedByCount > 1;
      
      results.push({
        filename: pdf.name,
        presentedByCount,
        logoCount,
        hasImageData,
        hasFooterPositioning,
        hasDuplication
      });
      
      console.log(`  "Presented by" occurrences: ${presentedByCount}`);
      console.log(`  "Near logo" references: ${logoCount}`);
      console.log(`  Has image data: ${hasImageData ? 'YES' : 'NO'}`);
      console.log(`  Has footer positioning: ${hasFooterPositioning ? 'YES' : 'NO'}`);
      console.log(`  Duplication detected: ${hasDuplication ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.error(`  Error checking ${pdf.name}:`, error.message);
      results.push({
        filename: pdf.name,
        error: error.message
      });
    }
  }
  
  // Write results to file
  const summaryText = recentPDFs.map(pdf => {
    const result = results.find(r => r.filename === pdf.name);
    if (result.error) {
      return `${pdf.name}: ERROR - ${result.error}`;
    }
    
    let status = 'OK';
    if (result.presentedByCount === 0) {
      status = 'MISSING FOOTER TEXT';
    } else if (result.hasDuplication) {
      status = 'DUPLICATION DETECTED';
    } else if (!result.hasImageData) {
      status = 'MISSING LOGO';
    }
    
    return `${pdf.name}:
  - Status: ${status}
  - "Presented by" count: ${result.presentedByCount}
  - Near logo references: ${result.logoCount}
  - Has image data: ${result.hasImageData ? 'YES' : 'NO'}
  - Has footer positioning: ${result.hasFooterPositioning ? 'YES' : 'NO'}`;
  }).join('\n\n');
  
  fs.writeFileSync(OUTPUT_FILE, summaryText);
  console.log(`\nResults written to ${OUTPUT_FILE}`);
}

// Run the check
checkPDFFooters().catch(err => {
  console.error('Error running PDF footer check:', err);
});