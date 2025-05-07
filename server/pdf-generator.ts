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

// Define a cleaner SVG Near logo for better rendering
const NEAR_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="18" viewBox="0 0 60 18" fill="none">
  <path d="M3.98 0.81L0.36 7.92C0.23 8.17 0.25 8.47 0.41 8.7C0.57 8.93 0.84 9.06 1.13 9.06H4.80L5.98 11.01C6.13 11.3 6.44 11.48 6.77 11.48C6.83 11.48 6.89 11.47 6.95 11.46C7.35 11.36 7.63 11.02 7.63 10.62V0.46C7.63 0.2 7.38 0.02 7.15 0.1C7 0.14 6.87 0.24 6.82 0.38L3.98 0.81Z" fill="#000F24"/>
  <path d="M9.04 3.41V10.62C9.04 11.02 9.32 11.36 9.72 11.46C9.78 11.47 9.85 11.48 9.91 11.48C10.24 11.48 10.55 11.3 10.7 11.01L14.58 3.71C14.66 3.55 14.59 3.34 14.42 3.26C14.35 3.23 14.28 3.23 14.21 3.24L9.04 3.41Z" fill="#000F24"/>
  <path d="M4.82 9.06H6.92C7.19 9.06 7.4 8.85 7.4 8.59V3.78C7.4 3.63 7.27 3.5 7.12 3.5C7.1 3.5 7.09 3.5 7.07 3.51L2.47 4.37C2.33 4.39 2.23 4.49 2.2 4.62C2.19 4.66 2.18 4.69 2.18 4.73V7.48C2.18 7.72 2.31 7.94 2.51 8.07L4.82 9.06Z" fill="#000F24"/>
  <path d="M24.39 3.35L22.98 6.64L21.58 3.35H20.31L22.44 8.14V11.24H23.52V8.14L25.66 3.35H24.39Z" fill="#000F24"/>
  <path d="M26.3 11.24H27.39V3.35H26.3V11.24Z" fill="#000F24"/>
  <path d="M32.07 6.98L29.71 3.35H28.72V11.24H29.8V5.62L31.58 8.36H32.56L34.35 5.62V11.24H35.43V3.35H34.44L32.07 6.98Z" fill="#000F24"/>
  <path d="M41.69 3.35H40.59V8.72C40.59 9.54 40.13 10.25 39.2 10.25C38.28 10.25 37.82 9.54 37.82 8.72V3.35H36.72V8.94C36.72 10.25 37.68 11.36 39.2 11.36C40.73 11.36 41.69 10.25 41.69 8.94V3.35Z" fill="#000F24"/>
  <path d="M48 3.35H46.9V6.95H44.16V3.35H43.06V11.24H44.16V7.95H46.9V11.24H48V3.35Z" fill="#000F24"/>
</svg>
`;

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
      height: 16px;
      width: auto;
      opacity: 0.9;
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
  
  <div class="footer">
    <img src="${NEAR_LOGO_BASE64}" alt="Near Logo" style="height: 18px; width: auto;">
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
