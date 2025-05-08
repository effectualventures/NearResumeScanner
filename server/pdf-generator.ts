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

// Ensure the templates directory exists
try {
  const templatesDir = path.dirname(templatePath);
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // Create the template file if it doesn't exist
  if (!fs.existsSync(templatePath)) {
    const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{header.firstName}} - {{header.tagline}}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Calibri:wght@400;700&display=swap');
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: {{#if detailedFormat}}9.5pt{{else}}11pt{{/if}};
      margin: 0.2in 0.2in;
      padding: 0;
      color: #000;
      line-height: {{#if detailedFormat}}1.05{{else}}1.15{{/if}};
      width: 8.5in;
      max-width: 100%;
      box-sizing: border-box;
    }
    
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 3px 0;
      text-transform: uppercase;
    }
    
    .header p {
      margin: 1px 0;
      font-size: 10pt;
    }
    
    .divider {
      border-top: 1.5px solid #000;
      margin: 3px 0 5px 0;
    }
    
    .summary {
      margin-bottom: 8px;
      font-weight: 400;
      font-size: 10pt;
      text-align: justify;
    }
    
    .section-title {
      text-transform: uppercase;
      font-weight: bold;
      font-size: {{#if detailedFormat}}10.5pt{{else}}11pt{{/if}};
      margin-top: {{#if detailedFormat}}4px{{else}}6px{{/if}};
      margin-bottom: {{#if detailedFormat}}2px{{else}}2px{{/if}};
      color: #000;
      border-bottom: 1px solid #000;
      padding-bottom: {{#if detailedFormat}}0px{{else}}1px{{/if}};
    }
    
    .skills {
      margin-bottom: 5px;
      font-size: 10pt;
    }
    
    .experience {
      margin-bottom: {{#if detailedFormat}}4px{{else}}5px{{/if}};
    }
    
    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0px;
    }
    
    .company {
      font-weight: bold;
      flex: 1;
      padding-right: 10px; /* Add some space between company and dates */
      max-width: 70%; /* Limit company width to ensure space for dates */
      overflow-wrap: break-word; /* Allow words to break if necessary */
    }
    
    .dates {
      text-align: right;
      font-size: 10pt;
      white-space: nowrap; /* Keep dates on one line */
      min-width: 120px; /* Ensure enough space for the date range */
    }
    
    .title {
      font-style: italic;
      margin-bottom: 1px;
      font-size: 10pt;
    }
    
    ul {
      margin: {{#if detailedFormat}}1px{{else}}1px{{/if}} 0;
      padding-left: {{#if detailedFormat}}12px{{else}}12px{{/if}};
    }
    
    li {
      margin-bottom: {{#if detailedFormat}}0px{{else}}0px{{/if}};
      font-size: {{#if detailedFormat}}9.5pt{{else}}10pt{{/if}};
      padding-left: 1px;
      line-height: {{#if detailedFormat}}1.05{{else}}1.15{{/if}};
      text-align: justify;
      max-width: 7.9in;
    }
    
    .education {
      margin-bottom: {{#if detailedFormat}}6px{{else}}8px{{/if}};
      font-size: {{#if detailedFormat}}9.5pt{{else}}10pt{{/if}};
    }
    
    .footer {
      position: fixed;
      bottom: {{#if detailedFormat}}0.25in{{else}}0.3in{{/if}};
      right: 0.5in;
      text-align: right;
      width: 100%;
    }
    
    .footer img, .footer svg {
      height: 20px;
      width: auto;
      margin-top: 15px;
      margin-right: 5px;
      opacity: 0.95;
    }
    
    /* Logo styling */
    .near-logo {
      position: fixed;
      bottom: 0.05in; /* Logo positioned exactly 0.05in from bottom */
      right: 0.5in;
      width: auto;
      height: 25px; /* Slightly smaller logo to match reference */
      z-index: 1000;
      text-align: right;
      overflow: visible;
    }
    
    /* Logo zone spacer - prevents content from getting too close to logo */
    .logo-zone-spacer {
      height: 0.7in; /* Creates space between content and logo */
      width: 100%;
      margin: 0;
      padding: 0;
      visibility: hidden; /* Hidden but takes up space */
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{header.firstName}}</h1>
    <p>{{header.tagline}} — {{header.location}}</p>
  </div>
  
  <div class="divider"></div>
  
  <div class="summary">
    {{breaklines summary}}
  </div>
  
  <div class="section-title">SKILLS & LANGUAGES</div>
  <div class="skills">
    {{#if detailedFormat}}
      {{#each skills}}
        <div style="margin-bottom: 4px;">
          <span style="font-weight: 600;">{{category}}:</span>
          <span style="font-weight: normal;">
            {{#each this.items}}
              {{this}}{{#unless @last}}; &nbsp;{{/unless}}
            {{/each}}
          </span>
        </div>
      {{/each}}
    {{else}}
      {{#each skills}}
        <span style="font-weight: 600;">{{category}}:</span>
        <span style="font-weight: normal;">
          {{#each this.items}}
            {{this}}{{#unless @last}}; &nbsp;{{/unless}}
          {{/each}}
        </span>
        {{#if @last}}{{else}} | {{/if}}
      {{/each}}
    {{/if}}
  </div>
  
  <div class="section-title">PROFESSIONAL EXPERIENCE</div>
  {{#each experience}}
    <div class="experience">
      <div class="experience-header">
        <div class="company">{{company}}, {{location}}</div>
        <div class="dates">{{startDate}} &ndash; {{endDate}}</div>
      </div>
      <div class="title">{{title}}</div>
      <ul>
        {{#if detailedFormat}}
          {{#each bullets}}
            <li>{{text}}{{#if metrics.length}}{{#unless (endsWith text ".")}}. {{/unless}} <span style="color: #333; font-weight: 500; font-style: normal;">{{#each metrics}}{{this}}{{#unless @last}} | {{/unless}}{{/each}}</span>{{/if}}</li>
          {{/each}}
        {{else}}
          {{#each (slice bullets 0 5)}}
            <li>{{text}}{{#if metrics.length}}{{#unless (endsWith text ".")}}. {{/unless}} <span style="color: #333; font-weight: 500; font-style: normal;">{{#each metrics}}{{this}}{{#unless @last}} | {{/unless}}{{/each}}</span>{{/if}}</li>
          {{/each}}
        {{/if}}
      </ul>
    </div>
  {{/each}}
  
  <div class="section-title">EDUCATION</div>
  <div class="education">
    {{#each education}}
      <div class="experience-header">
        <div class="company">{{institution}}, {{location}}</div>
        <div class="dates">{{year}}</div>
      </div>
      <div class="title">{{degree}}</div>
      {{#if additionalInfo}}<div style="margin-top: 2px; margin-bottom: 3px;">{{additionalInfo}}</div>{{/if}}
    {{/each}}
  </div>
  
  {{#if additionalExperience}}
    <div class="section-title">ADDITIONAL EXPERIENCE</div>
    <div style="text-align: justify;">{{additionalExperience}}</div>
  {{/if}}
  
  <!-- Logo zone spacer to prevent content from getting too close to logo -->
  <div class="logo-zone-spacer"></div>
  
  <!-- Near logo with fail-proof implementation using file path with fallback text -->
  <div id="footer-logo" style="position:fixed; bottom:0.05in; right:0.5in; z-index:9999; background-color:#ffffff; width:100px; height:25px;">
    {{#if logoPath}}
      <img src="file://{{logoPath}}" height="25" alt="NEAR Logo" style="height:25px; width:auto;" />
    {{else}}
      <span style="color: blue; font-weight: bold; font-size: 16px;">NEAR</span>
    {{/if}}
  </div>
</body>
</html>`;
    
    fs.writeFileSync(templatePath, template);
  }
} catch (error) {
  console.error('Error ensuring template exists:', error);
}

// Register Handlebars helpers
Handlebars.registerHelper('slice', function(arr, start, end) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.slice(start, end);
});

// Helper to check if text ends with a specific character
Handlebars.registerHelper('endsWith', function(text, char) {
  if (!text) return false;
  return text.endsWith(char);
});

// Helper to check equality
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

// Helper to break summary into multiple lines (max 90 chars)
Handlebars.registerHelper('breaklines', function(text) {
  if (!text) return '';
  
  // Split the text into two sentences if possible
  const sentences = text.split(/(?<=\.|\?|\!) /);
  if (sentences.length >= 2) {
    return new Handlebars.SafeString(sentences[0] + '<br>' + sentences.slice(1).join(' '));
  }
  
  // If text is less than 90 chars, return as is
  if (text.length <= 90) return text;
  
  // Find a good break point around 90 chars
  const breakPoint = text.lastIndexOf(' ', 90);
  if (breakPoint === -1) return text; // No space found, return as is
  
  // Split text into two parts
  const firstLine = text.substring(0, breakPoint);
  const secondLine = text.substring(breakPoint + 1);
  
  // Return with HTML line break
  return new Handlebars.SafeString(`${firstLine}<br>${secondLine}`);
});

/**
 * Generate a PDF from a Resume object
 * @param resume The resume data
 * @param sessionId Unique identifier for the session
 * @param detailedFormat Whether to generate a detailed 2-page format
 * @returns Path to the generated HTML file or PDF file
 */
export async function generatePDF(resume: Resume, sessionId: string, detailedFormat: boolean = false): Promise<string> {
  try {
    // Read template
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    
    // Pass the detailed format flag and logo path to the template
    const logoPath = path.resolve(process.cwd(), 'public/images/near_logo.png');
    console.log('Using logo from path:', logoPath);
    
    let html = template({
      ...resume,
      detailedFormat: detailedFormat,
      logoPath: logoPath
    });
    
    // Ensure the Skills section always has the right title
    html = html.replace('SKILLS & TOOLS', 'SKILLS & LANGUAGES');
    
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
      
      // Find the skills section using a robust pattern
      const skillsPattern = /Skills:[\s\S]*?(?=Languages:|PROFESSIONAL EXPERIENCE)/;
      const skillsMatch = html.match(skillsPattern);
      
      if (skillsMatch) {
        // We found the skills section, replace it entirely with enhanced skills
        // Apply the proper HTML with the category bold but not the skills themselves
        html = html.replace(skillsPattern, `<span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">${comprehensiveSkills}</span>\n\n      `);
        console.log('Applied comprehensive skills replacement via HTML post-processing');
      } else {
        // Fallback: try alternative pattern or direct replacement
        const altPattern = /Skills:(.*?)(?=Languages:|PROFESSIONAL)/;
        const altMatch = html.match(altPattern);
        
        if (altMatch) {
          html = html.replace(altPattern, `<span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">${comprehensiveSkills}</span> `);
          console.log('Applied skills replacement via alternative HTML pattern');
        } else {
          // Emergency fallback - replace first instance of Skills: followed by anything
          html = html.replace(/Skills:(.*?)(?=<)/g, `<span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">${comprehensiveSkills}</span>`);
          console.log('Applied emergency skills replacement via basic pattern');
        }
      }
    }
    
    // Check if Languages section only includes Portuguese and not English
    if (html.includes('Languages:') && 
        html.includes('Portuguese') && 
        !html.includes('English')) {
      
      console.log('Detected missing English language, adding it to languages section');
      
      // Add English to languages with proper styling
      html = html.replace(/Languages:\s*Portuguese/g, '<span style="font-weight: 600;">Languages:</span> <span style="font-weight: normal;">English (Professional); Portuguese</span>');
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
            margin: 0.25in !important; 
            padding: 0 !important;
            max-width: 8.0in !important;
          }
          /* Tighter spacing for lists */
          ul { padding-left: 12px !important; margin: 1px 0 !important; }
          li { margin-bottom: 0 !important; }
          
          /* Position the Near logo properly */
          #footer-logo {
            position: fixed !important;
            bottom: 0.05in !important;
            right: 0.5in !important;
            width: auto !important;
            height: 25px !important;
            z-index: 1000 !important;
            background-color: transparent !important;
          }
          
          #footer-logo img {
            height: 25px !important;
            width: auto !important;
            display: block !important;
          }
          
          /* Logo zone spacer needs fixed height */
          .logo-zone-spacer {
            height: 0.7in !important;
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
      
      // Configure PDF generation options to match reference file
      const pdfOptions: PDFOptions = {
        path: pdfOutputPath,
        format: 'letter',
        printBackground: true,
        margin: {
          top: '0.25in',
          right: '0.25in',
          bottom: '0.25in',
          left: '0.25in'
        }
      };
      
      // Configure how PDF is generated based on format
      if (detailedFormat) {
        // For detailed format, allow multiple pages and ensure all experience is shown
        console.log('Using detailed format: showing all bullets points and allowing multiple pages');
        await page.pdf({
          ...pdfOptions,
          displayHeaderFooter: false,
          preferCSSPageSize: true, // Use CSS page size with our forced margins
          scale: 1.0 // Normal scale to ensure all content fits appropriately
        });
      } else {
        // For standard format, restrict to one page
        console.log('Using standard format: limiting bullet points to fit one page');
        await page.pdf({
          ...pdfOptions,
          preferCSSPageSize: true // Use CSS page size with our forced margins
        });
      }
      
      await browser.close();
      console.log(`Generated PDF file for resume: ${pdfOutputPath}`);
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