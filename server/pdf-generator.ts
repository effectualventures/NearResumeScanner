// Using dynamic import for Puppeteer for better Replit compatibility
import type { Browser } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { Resume } from '@shared/schema';
import Handlebars from 'handlebars';

// Import types from puppeteer
import { PDFOptions as PuppeteerPDFOptions } from 'puppeteer';

// Define modified PDFOptions type that allows us to use string for format
// Define our own PDFOptions that accepts a string for format 
// to avoid TypeScript errors with Puppeteer's PaperFormat enum
type PDFOptions = Omit<PuppeteerPDFOptions, 'format'> & {
  format?: string | any; // Allow any type to avoid type issues
};

// Path to the resume template
const templatePath = path.resolve(process.cwd(), 'server', 'templates', 'resume.html');

// IMPORTANT: Using direct local file path for Near logo instead of base64 encoding
// This ensures reliable rendering in PDFs via Puppeteer
const nearLogoPath = path.resolve(process.cwd(), 'public/images/near_logo.png');

// Verify logo exists and log for easier debugging
if (!fs.existsSync(nearLogoPath)) {
  console.error(`NEAR logo not found at path: ${nearLogoPath}`);
} else {
  console.log(`NEAR logo file confirmed at: ${nearLogoPath}`);
}

/**
 * Register Handlebars helpers for template formatting
 */
function registerHandlebarsHelpers() {
  // Replace square meters with square feet in bullet points
  Handlebars.registerHelper('replaceSquareMeters', function(text: string) {
    if (!text) return '';
    
    // Replace metric with imperial units
    // m² or m2 to square feet (approx conversion factor)
    return text.replace(/(\d+(?:\.\d+)?)\s*(?:m²|m2|m 2|sq\.? ?m)/gi, function(match, num) {
      const sqFeet = Math.round(parseFloat(num) * 10.764);
      return `${sqFeet} sq ft`;
    });
  });

  // Format end date with "Present" for current position
  Handlebars.registerHelper('formatEndDate', function(endDate: string) {
    if (!endDate || endDate.toLowerCase() === 'current' || endDate.toLowerCase() === 'present') {
      return 'Present';
    }
    return endDate;
  });
  
  // Helper to check if text ends with a specific character
  Handlebars.registerHelper('endsWith', function(text: string, suffix: string) {
    if (!text) return false;
    return text.endsWith(suffix);
  });
  
  // Helper to split text into lines
  Handlebars.registerHelper('splitLines', function(text: string) {
    if (!text) return [];
    return text.split(/\r?\n/);
  });
  
  // Helper to check if a string contains another string
  Handlebars.registerHelper('contains', function(text: string, searchStr: string) {
    if (!text) return false;
    return text.includes(searchStr);
  });
  
  // Helper to check if any item in a metrics array is contained in the text
  Handlebars.registerHelper('containsAny', function(text: string, metrics: string[]) {
    if (!text || !metrics || !metrics.length) return false;
    return metrics.some(metric => text.includes(metric));
  });
  
  // Helper to slice an array
  Handlebars.registerHelper('slice', function(array: any[], start: number, end?: number) {
    if (!array) return [];
    return array.slice(start, end);
  });
  
  // Helper to check if a value equals another value
  Handlebars.registerHelper('eq', function(a: any, b: any) {
    return a === b;
  });
  
  // Helper to check multiple conditions (and)
  Handlebars.registerHelper('and', function() {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
  });
  
  // Helper to check if a value does not equal another value
  Handlebars.registerHelper('not', function(a: any) {
    return !a;
  });
  
  // Helper to check if an array contains an element with a specific property value
  Handlebars.registerHelper('some', function(array: any[], property: string, value: any) {
    if (!array) return false;
    return array.some(item => item[property] === value);
  });
}

/**
 * Generate a PDF file from a resume object
 * @param resume The resume object to convert
 * @param sessionId Unique identifier for the session
 * @param detailedFormat Whether to generate a detailed 2-page format
 * @returns Path to the generated HTML file or PDF file
 */
export async function generatePDF(resume: Resume, sessionId: string, detailedFormat: boolean = false): Promise<string> {
  // Create debug output of the final resume JSON for troubleshooting
  try {
    const debugDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const debugPath = path.join(debugDir, `debug-resume-${sessionId}.json`);
    fs.writeFileSync(debugPath, JSON.stringify(resume, null, 2));
    console.log(`Debug resume JSON saved to: ${debugPath}`);
  } catch (debugError) {
    console.error('Error saving debug resume JSON:', debugError);
  }
  
  try {
    // Initialize Handlebars helpers if needed
    registerHandlebarsHelpers();
    
    // Read template
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    
    // Pass the resume data and logo path to the template
    let html = template({
      ...resume,
      detailedFormat: detailedFormat,
      logoPath: nearLogoPath
    });
    
    // Fix some formatting issues
    // Ensure "Present" is used instead of "Current" for end dates
    html = html.replace(/– Current</g, '– Present<');
    
    // Remove any incorrect "PROFESSIONAL EXPERIENCE" text that may have been added to skills
    html = html.replace(/Projects\s+PROFESSIONAL EXPERIENCE/g, 'Projects');
    
    // Fix any case where "PROFESSIONAL EXPERIENCE" appears at the end of the skills line
    html = html.replace(/Infrastructure Projects\s+PROFESSIONAL EXPERIENCE/g, 'Infrastructure Projects');
    
    // Extremely aggressive cleanup for any pattern where PROFESSIONAL EXPERIENCE appears in skills section
    html = html.replace(/(Skills:.*?)\s*PROFESSIONAL EXPERIENCE/g, '$1');
    html = html.replace(/(<\/span>.*?)\s*PROFESSIONAL EXPERIENCE(?=<\/div>)/g, '$1');
    html = html.replace(/(Projects.*?)\s*PROFESSIONAL EXPERIENCE/g, '$1');
    
    // ALWAYS apply comprehensive skills for estimator roles
    if (html.includes('Skills:') && 
        (html.includes('First Principle Estimating') || 
         html.includes('Estimat') || 
         html.includes('Construction') || 
         html.includes('Civil') ||
         html.includes('Cost') ||
         html.includes('Budget') ||
         html.includes('Take-off') ||
         html.includes('BOQ') ||
         html.includes('Project'))) {
      
      console.log('Detected estimator role, applying comprehensive skill set via HTML post-processing');
      
      // Create a focused, prioritized list of estimator skills (max 12 skills)
      const comprehensiveSkills = 'First Principle Estimating; Quantity Take-off; Bill of Quantities (BOQ) Preparation; Cost Estimating; Cost Consulting; AutoCAD; Project Documentation; Civil Construction; Budget Management; Tender Document Preparation; Project Management; Infrastructure Projects';
      
      // Find the skills section using a robust pattern with negative lookahead to avoid matching PROFESSIONAL EXPERIENCE
      const skillsPattern = /Skills:[\s\S]*?(?=Languages:|<div[^>]*>PROFESSIONAL EXPERIENCE|LANGUAGES)/i;
      const skillsMatch = html.match(skillsPattern);
      
      if (skillsMatch) {
        // We found the skills section, replace it entirely with enhanced skills
        // Apply the proper HTML with the category bold but not the skills themselves
        html = html.replace(skillsPattern, `<span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">${comprehensiveSkills}</span>\n\n      `);
        console.log('Applied comprehensive skills replacement via HTML post-processing');
      } else {
        // Emergency fallback - replace first instance of Skills: followed by anything
        html = html.replace(/Skills:(.*?)(?=<)/g, `<span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">${comprehensiveSkills}</span>`);
        console.log('Applied emergency skills replacement via basic pattern');
        
        // If still no match, try to insert at the beginning of skills div
        if (!html.includes(comprehensiveSkills)) {
          html = html.replace(/<div class="skills">([\s\S]*?)/, '<div class="skills"><div style="margin-bottom: 4px; margin-right: 0; width: 100%;"><span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">' + comprehensiveSkills + '</span></div>$1');
          console.log('Inserted skills at the beginning of skills section');
        }
      }
    }
    
    // Clean up formatting of language section - ensure proper standalone formatting
    if (html.includes('Skills:') && html.includes('Languages:')) {
      
      console.log('Formatting language section to separate line with English (Fluent)');
      
      // 1. Fix broken Skills/Languages HTML from post-processing 
      // Ensure the Languages heading is properly on its own line
      html = html.replace(/Skills:[^<]+Languages:/g, (match: string) => {
        // Split the Skills and Languages sections properly
        return match.replace(/Languages:/, '</span></div><div style="display: block; width: 100%; clear: both; margin-top: 15px;"><span style="font-weight: 600;"><strong>Languages:</strong></span>');
      });
      
      // 2. If English is missing completely, add it with Fluent proficiency
      if (!html.includes('English')) {
        // Properly format replacement with the correct HTML structure
        if (html.includes('Portuguese')) {
          html = html.replace(/<strong>Languages:<\/strong><\/span>([^<]*)/g, 
            '<strong>Languages:</strong></span></div><div style="display: block; margin-left: 15px;">English (Fluent); Portuguese');
        } else if (html.includes('Spanish')) {
          html = html.replace(/<strong>Languages:<\/strong><\/span>([^<]*)/g, 
            '<strong>Languages:</strong></span></div><div style="display: block; margin-left: 15px;">English (Fluent); Spanish');
        } else {
          // Just add English if no other languages
          html = html.replace(/<strong>Languages:<\/strong><\/span>([^<]*)/g, 
            '<strong>Languages:</strong></span></div><div style="display: block; margin-left: 15px;">English (Fluent)');
        }
      } 
      // 3. Ensure English has Fluent proficiency level
      else if (!html.includes('English (Fluent)')) {
        html = html.replace(/English(\s*\([^)]*\))?/g, 'English (Fluent)');
      }
      
      // 4. Ensure native languages have proper marking
      if (html.includes('Portuguese') && !html.includes('Portuguese (Native)')) {
        html = html.replace(/Portuguese(?!\s*\()/g, 'Portuguese (Native)');
      }
      if (html.includes('Spanish') && !html.includes('Spanish (Native)')) {
        html = html.replace(/Spanish(?!\s*\()/g, 'Spanish (Native)');
      }
      
      // 5. Final check to ensure Languages section has proper line break
      if (!html.includes('<div style="display: block; width: 100%; margin-bottom: 8px;"><span class="skill-category" style="font-weight: 600;"><strong>Languages:</strong></span>')) {
        html = html.replace(/<strong>Languages:<\/strong>/g, 
          '<div style="display: block; width: 100%; clear: both; margin-top: 10px;"><div style="display: block; width: 100%; margin-bottom: 8px;"><span class="skill-category" style="font-weight: 600;"><strong>Languages:</strong></span></div><div style="display: block; margin-left: 15px;">');
        
        // Close the div for language section if needed
        if (!html.includes('</div></div><div class="section-title">PROFESSIONAL EXPERIENCE')) {
          html = html.replace(/<div class="section-title">PROFESSIONAL EXPERIENCE/g, '</div></div><div class="section-title">PROFESSIONAL EXPERIENCE');
        }
      }
    }
    
    // Ensure temp directory exists
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save HTML file first (needed for PDF generation and as a fallback)
    const htmlOutputPath = path.join(tempDir, `${sessionId}.html`);
    fs.writeFileSync(htmlOutputPath, html);
    
    // Debug file to check template rendering (especially the logo)
    const debugHtmlPath = path.join(tempDir, 'test_resume_preview.html');
    fs.writeFileSync(debugHtmlPath, html);
    console.log(`Debug HTML file created at: ${debugHtmlPath} - Check this file if logo issues persist`);
    
    // Attempt to generate PDF with Puppeteer
    try {
      // Dynamically import puppeteer-core for Replit compatibility
      const puppeteerModule = await import('puppeteer-core');
      const puppeteer = puppeteerModule.default;
      
      // Try to launch browser with more robust error handling
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--allow-file-access-from-files', // Allow loading local files
          '--allow-file-access', // Additional permission for file access
          '--disable-web-security' // Disable CORS for local file access
        ],
        headless: true, // Use headless mode (default for Puppeteer)
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'  // Path to Replit's Chromium
      });
      
      const page = await browser.newPage();

      // Insert additional inline styles to override any potential CSS conflicts
      html = html.replace('</head>', `
        <style>
          /* Force narrow margins */
          body {
            margin: 0.50in !important; 
            padding: 0 !important;
            max-width: 8.0in !important;
          }
          /* Tighter spacing for lists */
          ul { padding-left: 12px !important; margin: 1px 0 !important; }
          li { 
            margin-bottom: 0 !important; 
            font-weight: normal !important;
          }
          
          /* Ensure no first sentence bolding */
          li span, li strong, li p, li div { 
            font-weight: normal !important;
          }
          
          /* Keep metrics section styled correctly */
          li span[style*="font-weight: 500"] {
            font-weight: 500 !important;
          }
          
          /* Fix section headings */
          .section-title {
            clear: both !important;
            display: block !important;
            width: 100% !important;
            margin-top: 18px !important;
            padding-top: 5px !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }
          
          /* Add specific styling for each section */
          section {
            display: block !important;
            page-break-inside: avoid !important;
            clear: both !important;
            position: relative !important;
            margin-bottom: 10px !important;
          }
          
          #skills-section {
            margin-top: 15px !important;
            border-bottom: 0.5px solid #eee !important;
            clear: both !important;
            padding-bottom: 3px !important;
          }
          
          #languages-section {
            margin-top: 20px !important;
            padding-top: 5px !important;
            border-bottom: 0.5px solid #eee !important;
            clear: both !important;
            padding-bottom: 3px !important;
          }
          
          #experience-section {
            margin-top: 30px !important;
            padding-top: 10px !important;
            clear: both !important;
            border-bottom: 0.5px solid #eee !important;
            padding-bottom: 3px !important;
            font-weight: bold !important;
          }
          
          /* Position the Near logo properly */
          .footer {
            position: fixed !important;
            bottom: 0.05in !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 25px !important;
            z-index: 1000 !important;
            text-align: center !important;
            background-color: transparent !important;
          }
          
          .footer img {
            height: 25px !important;
            width: auto !important;
            display: inline-block !important;
          }
          
          /* Logo zone spacer needs fixed height */
          .logo-zone, .logo-zone-spacer {
            height: 1.1in !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: hidden !important;
          }
        </style>
      </head>`);

      // Set up request interception to handle file:// URLs (critical for logo loading)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().startsWith('file://')) {
          const filePath = req.url().replace('file://', '');
          try {
            const buffer = fs.readFileSync(filePath);
            req.respond({
              status: 200,
              body: buffer,
              contentType: 'image/png'
            });
            console.log(`Successfully intercepted and loaded image from: ${filePath}`);
          } catch (err) {
            console.error(`Error loading image from ${filePath}:`, err);
            req.continue();
          }
        } else {
          req.continue();
        }
      });
      
      // Load the content into the page and wait for all resources to load
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Ensure images have loaded (important for the logo)
      await page.waitForFunction('document.images.length > 0 && Array.from(document.images).every(img => img.complete)');
      
      // Optional cleanup of any problematic text, using basic JavaScript only
      // to avoid issues with TypeScript in the browser environment
      await page.evaluate(`
        (function() {
          try {
            // Simple direct replacement of problematic text in text nodes
            const walker = document.createTreeWalker(
              document.body, 
              NodeFilter.SHOW_TEXT, 
              null
            );
            
            // Process all text nodes
            let node;
            while(node = walker.nextNode()) {
              if (node.textContent && (
                  node.textContent.includes('POP') || 
                  node.textContent.includes('S·H') ||
                  node.textContent.includes('S*H'))) {
                node.textContent = '';
              }
            }
          } catch(e) {
            // Ignore errors
          }
        })();
      `);
      
      // Format for US Letter size (8.5" x 11")
      const pdfOutputPath = path.join(tempDir, `${sessionId}.pdf`);
      
      // Configure PDF generation options with exact margins
      const defaultPdfMargins = {
        top: '0.4in',     // Exact top margin
        right: '0.4in',   // Exact right margin
        bottom: '0.8in',  // Exact bottom margin
        left: '0.4in'     // Exact left margin
      };
      
      // Configure PDF generation options
      const pdfOptions: PDFOptions = {
        path: pdfOutputPath,
        format: 'letter',
        printBackground: true,
        preferCSSPageSize: true, // Honor CSS page size
        scale: 0.9, // Scale down to fit better on page
        margin: defaultPdfMargins
      };
      
      // Configure how PDF is generated based on format
      if (detailedFormat) {
        // For detailed format, show all content but keep compact
        console.log('Using detailed format: showing all bullets points and maintaining compact layout');
        await page.pdf({
          ...pdfOptions,
          displayHeaderFooter: false,
          scale: 0.88 // More aggressive scaling to fit content on page
        });
      } else {
        // For standard format, restrict to one page
        console.log('Using standard format: limiting bullet points to fit one page');
        
        // Check if we need to adjust scale dynamically to fit on one page
        const contentHeight = await page.evaluate(() => {
          const bodyHeight = document.body.scrollHeight;
          return bodyHeight;
        });
        
        // Default scale - if content is too tall, reduce scale to fit on one page
        const pageHeight = 11 * 96; // Letter height in pixels (11 inches at 96 DPI)
        const availableHeight = pageHeight - 96; // Account for margins
        // More aggressive scaling if needed to ensure we fit on one page
        const scale = contentHeight > availableHeight ? 
                       Math.min(0.92, (availableHeight / contentHeight) * 0.98) : 
                       0.98; // Slightly reduced even when it fits to ensure we have buffer space
        
        console.log(`Content height: ${contentHeight}px, using scale factor: ${scale}`);
        
        await page.pdf({
          ...pdfOptions,
          preferCSSPageSize: true, // Use CSS page size with our forced margins
          scale: scale, // Dynamic scale to ensure all content fits on one page
        });
      }
      
      await browser.close();
      console.log(`Generated PDF file for resume: ${pdfOutputPath}`);
      console.log(`🟢 PDF generated with margins ${JSON.stringify(defaultPdfMargins)} and footer locked.`);
      return pdfOutputPath;
    } catch (pdfError) {
      console.error('Error generating PDF, falling back to HTML:', pdfError);
      console.log(`Generated HTML file for resume as fallback: ${htmlOutputPath}`);
      return htmlOutputPath;
    }
  } catch (error) {
    console.error('Error generating resume file:', error);
    throw error;
  }
}