/**
 * Script to check HTML templates for footer elements
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the HTML files directory
const HTML_DIR = path.join(__dirname, 'temp');
const OUTPUT_FILE = path.join(__dirname, 'html_footer_check_results.txt');

/**
 * Find recent HTML template files
 */
function findRecentHTMLFiles() {
  // Get all files in the temp directory
  const files = fs.readdirSync(HTML_DIR)
    .filter(f => f.endsWith('_v2.html') || f.includes('preview'))
    .map(f => ({
      name: f,
      path: path.join(HTML_DIR, f),
      mtime: fs.statSync(path.join(HTML_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime); // Sort newest first
  
  // Return the 3 most recent files
  return files.slice(0, 3);
}

/**
 * Check HTML content for footer elements
 */
async function checkHTMLFooters() {
  console.log('Starting HTML footer element check...');
  
  const recentHTMLFiles = findRecentHTMLFiles();
  const results = [];
  
  if (recentHTMLFiles.length === 0) {
    console.log('No HTML files found to check.');
    return;
  }
  
  console.log(`Found ${recentHTMLFiles.length} recent HTML files to check:`);
  recentHTMLFiles.forEach(html => console.log(`- ${html.name}`));
  
  // For each HTML file, check footer elements
  for (const html of recentHTMLFiles) {
    console.log(`\nChecking ${html.name}...`);
    
    try {
      // Read the HTML file
      const htmlContent = fs.readFileSync(html.path, 'utf8');
      
      // Check for different footer elements
      const mainFooterMatch = htmlContent.match(/<footer\s+id="main-footer"/g) || [];
      const positionedFooterMatch = htmlContent.match(/id="positioned-footer"/g) || [];
      const presentedByCount = (htmlContent.match(/Presented by/g) || []).length;
      
      results.push({
        filename: html.name,
        mainFooterCount: mainFooterMatch.length,
        positionedFooterCount: positionedFooterMatch.length,
        presentedByCount
      });
      
      console.log(`  main-footer elements: ${mainFooterMatch.length}`);
      console.log(`  positioned-footer elements: ${positionedFooterMatch.length}`);
      console.log(`  "Presented by" occurrences: ${presentedByCount}`);
      
    } catch (error) {
      console.error(`  Error checking ${html.name}:`, error.message);
      results.push({
        filename: html.name,
        error: error.message
      });
    }
  }
  
  // Write results to file
  const summaryText = recentHTMLFiles.map(html => {
    const result = results.find(r => r.filename === html.name);
    if (result.error) {
      return `${html.name}: ERROR - ${result.error}`;
    }
    return `${html.name}:\n` +
           `  - main-footer elements: ${result.mainFooterCount}\n` +
           `  - positioned-footer elements: ${result.positionedFooterCount}\n` +
           `  - "Presented by" occurrences: ${result.presentedByCount}`;
  }).join('\n\n');
  
  fs.writeFileSync(OUTPUT_FILE, summaryText);
  console.log(`\nResults written to ${OUTPUT_FILE}`);
}

// Run the check
checkHTMLFooters().catch(err => {
  console.error('Error running HTML footer check:', err);
});