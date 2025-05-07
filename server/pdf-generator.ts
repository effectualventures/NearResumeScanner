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

// Load the Near logo SVG from file
const NEAR_LOGO_SVG = fs.readFileSync(path.resolve(process.cwd(), 'near logo.svg'), 'utf8');

// Convert the SVG to a data URL for embedding
const NEAR_LOGO_BASE64 = 'data:image/svg+xml;base64,' + Buffer.from(NEAR_LOGO_SVG).toString('base64');

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
              {{this}}{{#unless @last}}; {{/unless}}
            {{/each}}
          </span>
        </div>
      {{/each}}
    {{else}}
      {{#each skills}}
        <span style="font-weight: 600;">{{category}}:</span>
        <span style="font-weight: normal;">
          {{#each this.items}}
            {{this}}{{#unless @last}}; {{/unless}}
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
    <div>{{additionalExperience}}</div>
  {{/if}}
  
  <!-- We'll add the logo directly via JavaScript after page load -->
  <div id="footer-placeholder" style="height: 30px;"></div>
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
    
    // Pass the detailed format flag to the template and ensure correct section titles
    let html = template({
      ...resume,
      detailedFormat: detailedFormat
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
          '--disable-gpu'
        ],
        headless: true, // Use true for compatibility with older puppeteer-core versions
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
        </style>
      </head>`);

      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Add the Near logo as a footer using JavaScript
      await page.evaluate(() => {
        // Remove any existing watermark-like elements that might be causing issues
        const existingWatermarks = document.querySelectorAll('[id*="watermark"], [class*="watermark"], [id*="captcha"], [class*="captcha"]');
        existingWatermarks.forEach(el => el.remove());
        
        // Create a fixed positioned footer with proper styling
        const footer = document.createElement('div');
        footer.style.position = 'fixed';
        footer.style.bottom = '0.4in';
        footer.style.right = '0.5in';
        footer.style.width = 'auto';
        footer.style.height = 'auto';
        footer.style.zIndex = '1000';
        footer.style.textAlign = 'right';
        
        // Create image element with absolute URL to our logo endpoint
        const img = document.createElement('img');
        
        // Use a data URI of the SVG inline to avoid any need for fetching
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjMwIiB2aWV3Qm94PSIwIDAgMTAyIDMwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjAuMTc3NSAyLjA0NDczTDI1LjI1NTMgNS40Njk3OUwxMS4yMDI4IDI2LjMwMzVDMTAuNzUzIDI2Ljk3MDMgMTAuMTc2MyAyNy41NDIgOS41MDU1NiAyNy45ODZDOC44MzQ4MyAyOC40Mjk5IDguMDgzMjIgMjguNzM3NCA3LjI5MzY1IDI4Ljg5MDlDNi41MDQwOCAyOS4wNDQ0IDUuNjkyMDIgMjkuMDQwOCA0LjkwMzgyIDI4Ljg4MDVDNC4xMTU2MiAyOC43MjAxIDMuMzY2NzIgMjguNDA2MSAyLjY5OTg5IDI3Ljk1NjNDMS4zNTMxNiAyNy4wNDc5IDAuNDIyNDQyIDI1LjY0MTggMC4xMTI0ODEgMjQuMDQ3MUMtMC4xOTc0NzkgMjIuNDUyNSAwLjEzODcxIDIwLjgwMDEgMS4wNDcwOSAxOS40NTM0TDExLjY3NDYgMy42OTc1M0MxMi41ODI5IDIuMzUwOCAxMy45ODkxIDEuNDIwMDggMTUuNTgzNyAxLjExMDEyQzE3LjE3ODMgMC44MDAxNiAxOC44MzA3IDEuMTM2MzUgMjAuMTc3NSAyLjA0NDczWiIgZmlsbD0iIzE1MURFRCIvPgo8cGF0aCBkPSJNMzcuNTUyNSAyLjA0NDcyQzM4Ljg5OTIgMi45NTMxIDM5LjgyOTkgNC4zNTkyNiA0MC4xMzk5IDUuOTUzODdDNDAuNDQ5OCA3LjU0ODQ3IDQwLjExMzYgOS4yMDA5IDM5LjIwNTMgMTAuNTQ3NkwyOC41Nzc4IDI2LjMwMzVDMjcuNjY5NCAyNy42NTAyIDI2LjI2MzMgMjguNTgwOSAyNC42Njg3IDI4Ljg5MDlDMjMuMDc0IDI5LjIwMDkgMjEuNDIxNiAyOC44NjQ3IDIwLjA3NDkgMjcuOTU2M0wxNC45OTcgMjQuNTMxMkwyOS4wNDk2IDMuNjk3NTFDMjkuOTU3OSAyLjM1MDc4IDMxLjM2NDEgMS40MjAwNyAzMi45NTg3IDEuMTEwMTFDMzQuNTUzMyAwLjgwMDE0NSAzNi4yMDU3IDEuMTM2MzMgMzcuNTUyNSAyLjA0NDcyWiIgZmlsbD0iIzE1MURFRCIvPgo8cGF0aCBkPSJNMzYuNDY5NSAyOUMzOC41NTcxIDI5IDQwLjI0OTUgMjcuMzA3NiA0MC4yNDk1IDI1LjIyQzQwLjI0OTUgMjMuMTMyNCAzOC41NTcxIDIxLjQ0IDM2LjQ2OTUgMjEuNDRDMzQuMzgxOCAyMS40NCAzMi42ODk1IDIzLjEzMjQgMzIuNjg5NSAyNS4yMkMzMi42ODk1IDI3LjMwNzYgMzQuMzgxOCAyOSAzNi40Njk1IDI5WiIgZmlsbD0iIzE1MURFRCIvPgo8cGF0aCBkPSJNNDguNzIwMSAxOC42MDYyQzQ4LjgyMDYgMTguODI0IDQ4Ljg3MDggMTkuMTA4NyA0OC44NzA4IDE5LjQ2MDRWMjYuMTQzNkM0OC44NzA4IDI2LjYxMjYgNDguODIwNiAyNy4wMDYyIDQ4LjcyMDEgMjcuMzI0NEM0OC42MzYzIDI3LjYyNTkgNDguNTEwNyAyNy44Njg4IDQ4LjM0MzIgMjguMDUzQzQ4LjE5MjUgMjguMjIwNSA0OC4wMTY2IDI4LjMzNzggNDcuODE1NiAyOC40MDQ4QzQ3LjYxNDYgMjguNDcxOCA0Ny40MDUzIDI4LjUwNTMgNDcuMTg3NSAyOC41MDUzVjI5LjAwNzhINTUuMzI3OVYyOC41MDUzQzU1LjExMDEgMjguNTA1MyA1NC45MDA3IDI4LjQ3MTggNTQuNjk5NyAyOC40MDQ4QzU0LjQ5ODcgMjguMzM3OCA1NC4zMTQ1IDI4LjIyMDUgNTQuMTQ3IDI4LjA1M0M1My45OTYzIDI3Ljg2ODggNTMuODcwNiAyNy42MjU5IDUzLjc3MDEgMjcuMzI0NEM1My42ODYzIDI3LjAwNjIgNTMuNjQ0NSAyNi42MTI2IDUzLjY0NDUgMjYuMTQzNlYxOS42MTEyQzUzLjk2MjggMTkuMTkyNCA1NC4zMzEyIDE4LjgxNTYgNTQuNzUgMTguNDgwNkM1NS4xNjg3IDE4LjEyODggNTUuNTcwNyAxNy45NTMgNTUuOTU2IDE3Ljk1M0M1Ni4yNTc1IDE3Ljk1MyA1Ni40OTIgMTguMDM2NyA1Ni42NTk1IDE4LjIwNDJDNTYuODI3IDE4LjM1NSA1Ni45NTI2IDE4LjU2NDMgNTcuMDM2MyAxOC44MzIzQzU3LjEzNjggMTkuMDgzNiA1Ny4xOTU0IDE5LjM5MzQgNTcuMjEyMiAxOS43NjE5QzU3LjI0NTcgMjAuMTEzNyA1Ny4yNjI0IDIwLjQ5MDUgNTcuMjYyNCAyMC44OTI1VjI2LjE0MzZDNTcuMjYyNCAyNy4wOTgzIDU3LjE2MTkgMjcuNzM0OCA1Ni45NjA5IDI4LjA1M0M1Ni43NiAyOC4zNTQ1IDU2LjQ1MDEgMjguNTA1MyA1Ni4wMzEzIDI4LjUwNTNWMjkuMDA3OEg2My44NzAyVjI4LjUwNTNDNjMuNjAyMiAyOC41MDUzIDYzLjM1MSAyOC40NzE4IDYzLjExNjUgMjguNDA0OEM2Mi44OTg3IDI4LjMzNzggNjIuNzA2MSAyOC4yMjA1IDYyLjUzODYgMjguMDUzQzYyLjM4NzkgMjcuODY4OCA2Mi4yNjIyIDI3LjYyNTkgNjIuMTYxNyAyNy4zMjQ0QzYyLjA3OCAyNy4wMDYyIDYyLjAzNjEgMjYuNjEyNiA2Mi4wMzYxIDI2LjE0MzZWMjAuODkyNUM2Mi4wMzYxIDIwLjAyMTYgNjEuOTE4OSAxOS4yODQ2IDYxLjY4NDQgMTguNjgxNkM2MS40NjY2IDE4LjA3ODYgNjEuMTU2NyAxNy41OTI4IDYwLjc1NDggMTcuMjI0NEM2MC4zNTI4IDE2LjgzOTEgNTkuODc1NCAxNi41NjI3IDU5LjMyMjcgMTYuMzk1MkM1OC43ODY3IDE2LjIyNzcgNTguMjA4OCAxNi4xNDQgNTcuNTg5MSAxNi4xNDRDNTcuMTM2OCAxNi4xNDQgNTYuNzA5NyAxNi4yMTEgNTYuMzA3NyAxNi4zNDVDNTUuOTIyNSAxNi40NjIyIDU1LjU1NCAxNi42MjE0IDU1LjIwMjIgMTYuODIyNEM1NC44NjcyIDE3LjAwNjYgNTQuNTU3NCAx Ny4yMjQ0IDU0LjI3MjYgMTcuNDc1NkM1My45ODc5IDE3LjcxMDEgNTMuNzQ1IDE3Ljk1MyA1My41NDQgMTguMjA0MkhWMTYuMDkzOEhVNTMuMzQzQzUyLjUwNTUgMTYuMzYxOCA1MS41OTI3IDE2LjYwNDYgNTAuNjA0NCAxNi44MjI0QzQ5LjYzMyAxNy4wNDAxIDQ4LjU3NzcgMTcuMTc0MSA0Ny40Mzg3IDE3LjIyNDRWMTcuNzUyQzQ3LjU3MjcgMTcuNzUyIDQ3LjcyMzUgMTcuNzcxIDQ3Ljg5MSAxNy44MjEzQzQ4LjA1ODUgMTcuODU0OCA0OC4yMDkyIDE3LjkzODYgNDguMzQzMiAxOC4wNzg2QzQ4LjQ5NCAxOC4yMTI2IDQ4LjYxOTYgMTguMzg4NSA0OC43MjAxIDE4LjYwNjJaIiBmaWxsPSIjMTUxREVEIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNjMuNTg1IDE5LjkxMjdDNjMuMzAwMyAyMC42NjY0IDYzLjE1NzkgMjEuNTEyMyA2My4xNTc5IDIyLjQ1MDNDNjMuMTU3OSAyMy40MDUgNjMuMzE3IDI0LjI5MjcgNjMuNjM1MiAyNS4xMTM1QzYzLjk1MzUgMjUuOTM0MiA2NC40MTQxIDI2LjY0NjEgNjUuMDE3MSAyNy4yNDlDNjUuNjM2OCAyNy44NTIgNjYuMzk4OSAyOC4zMjk0IDY3LjMwMzQgMjguNjgxMUM2OC4yMjQ3IDI5LjAxNjEgNjkuMjg4MyAyOS4xODM2IDcwLjQ5NDIgMjkuMTgzNkM3MS4xOTc3IDI5LjE4MzYgNzEuODA5MSAyOS4wOTE1IDcyLjMyODMgMjguOTA3M0M3Mi44NDc2IDI4LjcyMyA3My4yOTk4IDI4LjUwNTMgNzMuNjg1MSAyOC4yNTRDNzQuMDU4OSAyOC4wMTAzIDc0LjM2MTcgMjcuNzU4NiA3NC41OTM2IDI3LjQ5OTFDNzQuNDczOCAyNy4xNjYxIDc0LjM5OTEgMjYuODI5NiA3NC4zODAxIDI2LjUyNUM3NC4xMzM1IDI2LjYxOTMgNzMuODc2NyAyNi42OTMyIDczLjYwOTcgMjYuNzQ2NkM3My4yMDc3IDI2LjgzMDMgNzIuNzcyMiAyNi44NzIyIDcyLjMwMzIgMjYuODcyMkM3MS43MDAyIDI2Ljg3MjIgNzEuMTY0MiAyNi43NjMzIDcwLjY5NTIgMjYuNTQ1NkM3MC4yNDMgMjYuMzI3OCA2OS44NDk0IDI2LjAzNDcgNjkuNTE0NCAyNS42NjYyQzY5LjE3OTQgMjUuMjk3NyA2OC45MDMgMjQuODcwNiA2OC42ODUzIDI0LjM4NDlDNjguNDY3NSAyMy44ODI0IDY4LjMgMjMuMzYzMSA2OC4xODI4IDIyLjgyNzFINzMuMTMyM0M3My40MTcxIDIyLjgyNzEgNzMuNjc2NyAyMi44MTg4IDczLjkxMTIgMjIuODAyQzc0LjE2MjQgMjIuNzg1MyA3NC4zNzE4IDIyLjcyNjYgNzQuNTM5MyAyMi42MjYxQzc0LjcyMzUgMjIuNTI1NiA3NC44NTc1IDIyLjM3NDkgNzQuOTQxMyAyMi4xNzM5Qzc1LjA0MTggMjEuOTcyOSA3NS4wOTIgMjEuNjk2NSA3NS4wOTIgMjEuMzQ0OEM3NS4wOTIgMjAuNjU4IDc0Ljk1OCgyMC4wMDQ4IDc0LjY5IDExOS4zODUxQzc0LjQzODggMTguNzY1MyA3NC4wNzAzIDE4LjIyMSA3My41ODQ2IDE3Ljc1MkM3My4xMTU2IDE3LjI4MyA3Mi41Mzc3IDE2LjkwNjEgNzEuODUxIDE2LjYyMTRDNzEuMTY0MiAxNi4zMzY2IDcwLjM4NTQgMTYuMTk0MiA2OS41MTQ0IDE2LjE5NDJDNjguNTQyOSAxNi4xOTQyIDY3LjY2MzUgMTYuMzQ1IDY2Ljg3NjMgMTYuNjQ2NkM2Ni4wODkxIDE2Ljk0OCAnNjUuNDE5MSAxNy4zNzUxIDY0Ljg2NjMgMTcuOTI3OEM2NC4zMTM2IDE4LjQ4MDYgNjMuODg2NSAxOS4xNDIyIDYzLjU4NSAxOS45MTI3Wk03MC43NDU1IDIwLjQxNTJDNzAuNzk1NyAyMC45MzQ0IDcwLjgyMDkgMjEuMzg2NyA3MC44MjA5IDIxLjc3MTlINjguMDA2OUM2Ny45NTY3IDIxLjI4NjIgNjcuOTMxNSAyMC44MTcyIDY3LjkzMTUgMjAuMzY0OUM2Ny45MzE1IDE5Ljk2MjkgNjcuOTQ4MyAxOS41Nzc3IDY3Ljk4MTggMTkuMjA5MkM2OC4wMTUzIDE4Ljg0MDcgNjguMDgyMyAxOC41MTQxIDY4LjE4MjggMTguMjI5M0M2OC4yODMzIDE3LjkyNzggNjguNDA5IDE3LjY5MzMgNjguNTU5NyAxNy41MjU4QzY4LjcyNzIgMTcuMzU4NCA2OC45MzY1IDE3LjI3NDYgNjkuMTg3OCAxNy4yNzQ2QzY5LjUwNiAxNy4yNzQ2IDY5Ljc2NTYgMTcuNDMzNyA2OS45NjY2IDE3Ljc1MkM3MC4xODQ0IDE4LjA3MDIgNzAuMzUxOSAxOC40NjM4IDcwLjQ2OTEgMTguOTMyOEM3MC42MDMxIDE5LjQwMTggNzAuNjk1MiAxOS44OTU5IDcwLjc0NTUgMjAuNDE1MloiIGZpbGw9IiMxNTFERUQiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik03NS40ODg3IDI1Ljk0MjZDNzUuNDg4NyAyNS4yNTU4IDc1LjY3MyAyNC42OTQ3IDc2LjA0MTUgMjQuMjU5MkM3Ni40MjY3IDIzLjgwNyA3Ni45MDQxIDIzLjQyMTcgNzcuNDczNiAyMy4xMDM1Qzc4LjA0MzEgMjIuNzg1MyA3OC42NTQ0IDIyLjUwODkgNzkuMzA3NyAyMi4yNzQ0Qzc5Ljk2MDkgMjIuMDM5OSA4MC41NzIzIDIxLjc5NyA4MS4xNDE4IDIxLjU0NThDODEuNzExMiAyMS4yNzc4IDgyLjE4MDIgMjAuOTY3OSA4Mi41NDg3IDIwLjYxNjJDODIuOTM0IDIwLjI2NDQgODMuMTI2NiAxOS44MjA2IDgzLjEyNjYgMTkuMjg0NlYxOS4xMzM4QzgzLjEyNjYgMTguOTMyOCA4My4xMDk4IDE4LjcyMzUgODMuMDc2MyAxOC41MDU3QzgzLjA0MjggMTguMjg4IDgyLjk4NDIgMTguMDk1MyA4Mi45MDA1IDE3LjkyNzhDODIuODMzNSAxNy43NDM2IDgyLjcyNDYgMTcuNjAxMiA4Mi41NzM5IDE3LjUwMDdDODIuNDM5OSAxNy4zODM1IDgyLjI3MjQgMTcuMzI0OSA4Mi4wNzE0IDE3LjMyNDlDODEuNzg2NiAxNy4zMjQ5IDgxLjU1MjEgMTcuNDUwNSA4MS4zNjc5IDE3LjcwMTdDODEuMjAwNCAxNy45MzYyIDgxLjA2NjQgMTguMjM3NyA4MC45NjU5IDE4LjYwNjJDODAuODgyMSAxOC45NTc5IDgwLjgzMTkgMTkuMzUxNiA4MC44MTUxIDE5Ljc4NzFDODAuNzk4NCAxOS4yMjI2IDgwLjc5ODQgMjAuNjQxMyA4MC44MTUxIDIxLjA0MzNDODAuNTMwNCAyMS4xNjA1IDgwLjIxMjEgMjEuMjUyNyA3OS44NjA0IDIxLjMxOTdDNzkuNTI1NCAyMS4zODY3IDc5LjE4MiAyMS40MjAyIDc4LjgzMDMgMjEuNDIwMkM3OC41Mjg4IDIxLjQyMDIgNzguMjM1NyAyMS4zOTUgNzcuOTUwOSAyMS4zNDQ4Qzc3LjY2NjIgMjEuMjc3OCA3Ny40MTQ5IDIxLjE2ODkgNzcuMTk3MiAyMS4wMTgyQzc2Ljk5NjIgMjAuODY3NCA3Ni44Mjg3IDIwLjY3NDggNzYuNjk0NyAyMC40NDAzQzc2LjU2MDcgMjAuMjA1OCA3Ni40OTM3IDE5LjkxMjcgNzYuNDkzNyAxOS41NjA5Qzc2LjQ5MzcgOC4xNTg5IDc2LjYxMSAxOC43NTcgNzYuODQ1NSAxOC4zNTVDNzcuMDggMTcuOTUzIDc3LjQzMTcgMTcuNjAxMiA3Ny45MDA3IDE3LjI5OTdDNzguMzY5NyAxNi45ODE1IDc4Ljk2NDMgMTYuNzMwMiA3OS42ODQ1IDE2LjU0NkM4MC40MDQ3IDE2LjM0NSA4MS4yNDIzIDE2LjI0NDUgODIuMTk3IDE2LjI0NDVDODIuOTUwNyAxNi4yNDQ1IDgzLjY2MjYgMTYuMzE5OSA4NC4zMzI2IDE2LjQ3MDZDODUuMDE5MyAxNi42MjE0IDg1LjYyMjMgMTYuODk3NyA4Ni4xNDE1IDE3LjI5OTdDODYuNjYwOCAxNy42ODUgODcuMDcxMSAxOC4yMjkzIDg3LjM3MjYgMTguOTMyOEM4Ny42NzQxIDE5LjYxOTYgODcuODI0OSAyMC41MDczIDg3LjgyNDkgMjEuNTk2VjYuOTkyOEM4Ny44MjQ5IDI2LjQ0NTEgODcuODc1MSAyNi44MTM2IDg3Ljk3NTYgMjcuMDk4M0M4OC4wOTI5IDI3LjM4MyA4OC4yMzUzIDI3LjYwOTIgODguNDAyNyAyNy43NzY3Qzg4LjU4NyAyNy45Mjc0IDg4Ljc4OCAyOC4wMzYzIDg5LjAwNTcgMjguMTAzM0M4OS4zOTY1IDI4LjIyMzUgODkuODYwNyAyOC4xNDU3IDg5Ljk0NSAyOC4wNTNDOTAuMTEyNSAyNy44Njg4IDkwLjIzODEgMjcuNjI1OSA5MC4zMjE4IDI3LjMyNDRDOTAuNDIyMyAyNy4wMDYyIDkwLjQ3MjYgMjYuNjEyNiA5MC40NzI2IDI2LjE0MzZWMTkuNDYwNEM5MC40NzI2IDE5LjEwODcgOTAuNDIyMyAxOC44MjQgOTAuMzIxOCAxOC42MDYyQzkwLjIyMTMgMTguMzg4NSA5MC4wOTU2IDE4LjIxMjYgODkuOTQ1IDE4LjA3ODZDODkuODExIDE3Ljk0NDcgODkuNjYwMiAxNy44NjA4IDg5LjQ5MjcgMTcuODI3M0M4OS4zMjUyIDE3Ljc3NzEgODkuMTc0NSAxNy43NTIgODkuMDQwNSAxNy43NTJWNy4yMjQ0QzkwLjE3OTUgMTcuMTc0MSA5MS4yMjYzIDE3LjA0MDEgOTIuMTgxIDE2LjgyMjRDOTMuMTUyNSAxNi42MDQ2IDk0LjA1NyoxNi4zNjE4IDk0Ljg5NDUgMTYuMDkzOEhVOTQuOTQ0N0wVOTUuMTIwNiAxOC41MzA4SFU5NS4xNzA5Qzk1Ljc1NzEgMTcuODc3NiA5Ni4zNzY4IDE3LjMyNDkgOTcuMDMwMSAxNi44NzI2Qzk3LjcwMDEgMTYuNDAzNiA5OC4zODY4IDE2LjE2OTEgOTkuMDkwMyAxNi4xNjkxQzk5LjUyNTggMTYuMTY5MSA5OS44OTQzIDE2LjI0NDUgMTAwLjE5NiAxNi4zOTUyQzEwMC41MTQgMTYuNTI5MiAxMDAuNzgyIDE2LjcyMTkgMTAxIDE2Ljk3MzFDMTAxLjIxOCAxNy4yMDc2IDEwMS4zNzcgMTcuNDc1NiAxMDEuNDc3IDE3Ljc3NzFDMTAxLjU3OCAxOC4wNzg2IDEwMS42MjggMTguMzg4NSAxMDEuNjI4IDE4LjcwNjdDMTAxLjYyOCAxOS4zMDk3IDEwMS40MDIgMTkuODM3MyAxMDAuOTUgMjAuMjg5NUMxMDAuNTE0IDIwLjcyNSA5OS45Njk3IDIwLjk0MjggOTkuMzE2NCAyMC45NDI4Qzk5LjAxNDkgMjAuOTQyOCA5OC42ODgzIDIwLjg3NTggOTguMzM2NiAyMC43NDE4QzUuMzM2NiAyMC42MDc4IDk4LjMwMzEgMjAuNDQ4NyA5OC4yMzYxIDIwLjI2NDRDOTguMTg1OCAyMC4wODAyIDk4LjA5MzcgMTkuOTA0MyA5Ny45NTk3IDE5LjczNjhDOTcuODQyNCAxOS41NjkzIDk3LjY4MzMgMTkuNDI2OCA5Ny40ODIzIDE5LjMwOTdDOTcuMjgxMyAxOS4xOTI0IDk3LjA1NTIgMTkuMTMzOCA5Ni44MDM5IDE5LjEzMzhDOTYuNTUyNyAxOS4xMzM4IDk2LjMyNjYgMTkuMTkyNCA5Ni4xMjU2IDE5LjMwOTdDOTUuOTI0NiAxOS40MjY5IDk1Ljc1NzEgMTkuNTg2MSA5NS42MjMxIDE5Ljc4NzFDOTUuNTA1OSAxOS45NzEzIDk1LjQxMzcgMjAuMTg5MSA5NS4zNDY3IDIwLjQ0MDNDOTUuMjc5NyAyMC42NzQ4IDk1LjI0NjIgMjAuOTE3NyA5NS4yNDYyIDIxLjE2ODlWMjYuMTQzNkM5NS4yNDYyIDI2LjYxMjYgOTUuMjg4MSAyNy4wMDYyIDk1LjM3MTkgMjcuMzI0NEM5NS40NzI0IDI3LjYyNTkgOTUuNTk4IDI3Ljg2ODggOTUuNzQ4NyAyOC4wNTNDOTUuOTE2MiAyOC4yMjA1IDk2LjEwMDUgMjguMzM3OCA5Ni4zMDE1IDI4LjQwNDhDOTYuNTAyNSAyOC40NzE4IDk2LjcxMTggMjguNTA1MyA5Ni45Mjk2IDI4LjUwNTNWMjkuMDA3OEg4OC43ODkyVjI5LjAwNDdDODguNjU1IDI5LjAzMDggODguNTA5NCAyOS4wNTcgODguMzUyNSAyOS4wODMxQzg4LjA1MSAyOS4xMzM0IDg3LjcyNDQgMjkuMTc1MyA4Ny4zNzI2IDI5LjIwODhDODcuMDM3NiAyOS4yNTkgODYuNjk0MyAyOS4yODQxIDg2LjM0MjUgMjkuMjg0MUM4NS42MzkgMjkuMjg0MSA4NS4wMDI2IDI5LjE3NTMgODQuNDMzMSAyOC45NTc1QzgzLjg4MDMgMjguNzM5OCA4My41MzcgMjguMzM3OCA4My40MDMgMjcuNzUxNUhVODMuMzUyN0M4My4yMTg3IDI3LjkwMjMgODMuMDUxMiAyOC4wNjk4IDgyLjg1MDIgMjguMjU0QzgyLjY0OTIgMjguNDM4MyA4Mi40MDYzIDI4LjYwNTggODIuMTIxNiAyOC43NTY1QzgxLjg1MzYgMjguOTA3MyA4MS41MjcgMjkuMDMyOSA4MS4xNDE4IDI5LjEzMzRDODAuNzczMyAyOS4yMzM5IDgwLjMzNzggMjkuMjg0MSA3OS44MzUzIDI5LjI4NDFDNzkuMTk4OCAyOS4yODQxIDc4LjYxMjUgMjkuMjE3MSA3OC4wNzY2IDI5LjA4MzFDNzcuNTQwNiAyOC45NjU5IDc3LjA4IDI4Ljc3MzMgNzYuNjk0NyAyOC41MDUzQzc2LjMwOTUgMjguMjM3MyA3Ni4wMDggMjcuODkzOSA3NS43OTAyIDI3LjQ3NTJDNzUuNTg5MiAyNy4wNTY0IDc1LjQ4ODcgMjYuNTQ1NiA3NS40ODg3IDI1Ljk0MjZaTTgwLjU4OSAyNS43NjY3QzgwLjU4OSAyNi4yMzU3IDgwLjY5NzkgMjYuNjA0MiA4MC45MTU3IDI2Ljg3MjJDODEuMTMzNCAyNy4xMjM0IDgxLjM4NDYgMjcuMjQ5IDgxLjY2OTQgMjcuMjQ5QzgxLjk1NDEgMjcuMjQ5IDgyLjIyMjEgMjcuMTczNyA4Mi40NzM0IDI3LjAyMjlDODIuNzI0NiAyNi44NzIyIDgyLjkxNzIgMjYuNjcxMiA4My4wNTEyIDI2LjQxOTlWMjEuOTcyOUhVODMuMDAxQzgyLjY5OTUgMjIuMTkwNiA4Mi40MDYzIDIyLjQ0MTkgODIuMTIxNiAyMi43MjY2QzgxLjgzNjkgMjIuOTk0NiA4MS41NzcyIDIzLjI4NzcgODEuMzQyOCAyMy42MDZDODEuMTI1IDIzLjkwNzUgODEuNDA4IDI0LjI0MjUgODAuNzkgMjQuNjExQzgwLjY1NiAyNC45Nzk1IDgwLjU4OSAyNS4zNjQ3IDgwLjU4OSAyNS43NjY3WiIgZmlsbD0iIzE1MURFRCIvPgo8L3N2Zz4=';
        img.alt = 'Near Logo';
        img.style.height = '24px';
        img.style.width = 'auto';
        img.style.opacity = '0.95';
        
        // Append the image to the footer and the footer to the body
        footer.appendChild(img);
        document.body.appendChild(footer);
      });
      
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
      
      // For detailed format, allow multiple pages
      if (detailedFormat) {
        await page.pdf({
          ...pdfOptions,
          displayHeaderFooter: false,
          preferCSSPageSize: true // Use CSS page size with our forced margins
        });
      } else {
        // For standard format, maximize page space
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
  } catch (error: any) {
    console.error('Error generating resume file:', error);
    throw new Error(`Failed to generate resume file: ${error?.message || 'Unknown error'}`);
  }
}
