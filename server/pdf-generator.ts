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
      margin-top: {{#if detailedFormat}}12px{{else}}14px{{/if}};
      margin-bottom: {{#if detailedFormat}}3px{{else}}3px{{/if}};
      color: #000;
      border-bottom: 1px solid #000;
      padding-bottom: {{#if detailedFormat}}1px{{else}}1px{{/if}};
      clear: both;
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
      height: 1.1in; /* Creates space between content and logo - increased to match reference */
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
  
  <div class="summary" style="line-height: 1.3; margin-bottom: 12px;">
    {{breaklines summary}}
  </div>
  
  <div class="section-title">SKILLS & LANGUAGES</div>
  <div class="skills">
    {{#if detailedFormat}}
      {{#each skills}}
        {{#if (eq category "Skills")}}
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600;">{{category}}:</span>
            <span style="font-weight: normal;">
              {{#each this.items}}
                {{this}}{{#unless @last}}; &nbsp;{{/unless}}
              {{/each}}
            </span>
          </div>
        {{else}}
          <div style="margin-top: 6px;">
            <span style="font-weight: 600;">{{category}}:</span>
            <span style="font-weight: normal;">
              {{#each this.items}}
                {{this}}{{#unless @last}}; &nbsp;{{/unless}}
              {{/each}}
            </span>
          </div>
        {{/if}}
      {{/each}}
    {{else}}
      {{#each skills}}
        {{#if (eq category "Skills")}}
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600;">{{category}}:</span>
            <span style="font-weight: normal;">
              {{#each this.items}}
                {{this}}{{#unless @last}}; &nbsp;{{/unless}}
              {{/each}}
            </span>
          </div>
        {{else}}
          <div style="margin-top: 6px; display: block; clear: both;">
            <span style="font-weight: 600;">{{category}}:</span>
            <span style="font-weight: normal;">
              {{#each this.items}}
                {{this}}{{#unless @last}}; &nbsp;{{/unless}}
              {{/each}}
            </span>
          </div>
        {{/if}}
      {{/each}}
    {{/if}}
  </div>
  
  <div class="section-title">PROFESSIONAL EXPERIENCE</div>
  {{#each experience}}
    <div class="experience">
      <div class="experience-header">
        <div class="company">{{company}} — {{location}}</div>
        <div class="dates">{{startDate}} &ndash; {{endDate}}</div>
      </div>
      <div class="title" style="font-style: italic; font-weight: normal;">{{title}}</div>
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
        <div class="company">{{institution}} — {{location}}</div>
        <div class="dates">{{year}}</div>
      </div>
      <div class="title" style="font-style: italic; font-weight: normal;">{{degree}}</div>
      {{#if additionalInfo}}<div style="margin-top: 2px; margin-bottom: 3px;">{{additionalInfo}}</div>{{/if}}
    {{/each}}
  </div>
  
  {{#if additionalExperience}}
    <div class="section-title">ADDITIONAL EXPERIENCE</div>
    <div style="text-align: justify;">
      {{#if (contains additionalExperience "Coursera")}}
        <ul style="list-style-type: disc; padding-left: 12px; margin: 2px 0;">
          <li>Construction Management Specialization — Columbia University (via Coursera), Expected 2025</li>
          {{#if (contains additionalExperience "AIQS")}}
          <li>Member, AIQS — Since December 2023</li>
          {{/if}}
          {{#if (contains additionalExperience "CAU BR")}}
          <li>CAU BR Certified Architect — Since 2011</li>
          {{/if}}
        </ul>
      {{else if (contains additionalExperience "AIQS")}}
        <ul style="list-style-type: disc; padding-left: 12px; margin: 2px 0;">
          {{#if (contains additionalExperience "Columbia")}}
          <li>Construction Management Specialization — Columbia University (via Coursera), Expected 2025</li>
          {{/if}}
          <li>Member, AIQS — Since December 2023</li>
          {{#if (contains additionalExperience "CAU BR")}}
          <li>CAU BR Certified Architect — Since 2011</li>
          {{/if}}
        </ul>
      {{else}}
        <ul style="list-style-type: disc; padding-left: 12px; margin: 2px 0;">
          <li>{{additionalExperience}}</li>
        </ul>
      {{/if}}
    </div>
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

// Helper to check if string contains a substring
Handlebars.registerHelper('contains', function(text, substring) {
  if (!text || !substring) return false;
  return text.includes(substring);
});

// Helper for logical "and" operation
Handlebars.registerHelper('and', function() {
  return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});

// Helper for logical "not" operation
Handlebars.registerHelper('not', function(value) {
  return !value;
});

// Helper to replace "Current" with "Present" in dates
Handlebars.registerHelper('formatEndDate', function(endDate) {
  if (!endDate) return '';
  return endDate === 'Current' ? 'Present' : endDate;
});

// Helper to check if any element in an array satisfies a condition
Handlebars.registerHelper('some', function(arr, propertyName, value) {
  if (!arr || !Array.isArray(arr)) return false;
  
  // Enhanced version - check if any item in array has matching property value
  return arr.some(item => {
    // If looking for a category that equals 'Languages'
    if (propertyName === 'category' && value === 'Languages') {
      return item && item.category === 'Languages';
    }
    
    // For other cases
    return item && item[propertyName] === value;
  });
});

// Helper to split text into lines for bulletpoints (split by semicolons)
Handlebars.registerHelper('splitLines', function(text: string) {
  if (!text) return [];
  // Split by semicolons, trim each item, and filter out empty lines
  return text.split(';')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
});

// Helper to check if text contains any of the items in an array
Handlebars.registerHelper('containsAny', function(text: string, items: string[]) {
  if (!text || !items || !Array.isArray(items)) return false;
  return items.some((item: string) => text.includes(item));
});

// No longer need the lambda helper since we're using a simpler pattern with property/equals

// Helper to intelligently handle line breaks for the summary
// The summary should only break if the text is substantially longer than a full line
Handlebars.registerHelper('breaklines', function(text) {
  if (!text) return '';
  
  // For summary section, use a higher minimum character threshold to avoid premature line breaks
  // Only break very long summaries that would look cramped on a single line
  if (text.length <= 180) {
    // Return the text as a single line for most summaries (no line break)
    return text;
  }
  
  // For longer text, find the most natural break point
  // First try to break at the end of a complete sentence
  const sentenceBreak = text.match(/[.!?]\s+/);
  if (sentenceBreak && sentenceBreak.index && sentenceBreak.index > 100 && sentenceBreak.index < 180) {
    // Found a good natural sentence break that's not too short or too long
    const firstLine = text.substring(0, sentenceBreak.index + 1); // Include the period/question mark/exclamation
    const secondLine = text.substring(sentenceBreak.index + 2); // Skip the period and space
    return new Handlebars.SafeString(`${firstLine}<br>${secondLine}`);
  }
  
  // If no good sentence break, find a good break point that doesn't cut off phrases
  // Look for breaks that don't occur in the middle of common phrases
  const goodBreakPattern = /\s+(?!(?:in|of|and|with|for|on|to|by|the|a|an)\s+)/g;
  let matches = [];
  let match;
  while ((match = goodBreakPattern.exec(text)) !== null) {
    if (match.index > 120 && match.index < 180) {
      matches.push(match.index);
    }
  }
  
  // If we found good break points, use the last one that still fits our constraint
  let breakPoint = -1;
  if (matches.length > 0) {
    breakPoint = matches[matches.length - 1];
  } else {
    // Fallback to simple space-based breaking if no good phrases found
    breakPoint = text.lastIndexOf(' ', 180);
  }
  
  if (breakPoint === -1) return text; // No good break found, return as is
  
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
    html = html.replace('SKILLS & TOOLS', 'SKILLS');
    
    // Make sure section titles are properly formatted and separated
    html = html.replace(/SKILLS<\/div>/g, 'SKILLS</div>');
    html = html.replace(/LANGUAGES<\/div>/g, 'LANGUAGES</div>');
    html = html.replace(/PROFESSIONAL EXPERIENCE<\/div>/g, 'PROFESSIONAL EXPERIENCE</div>');
    
    // Remove any incorrect "PROFESSIONAL EXPERIENCE" text that may have been added to skills
    html = html.replace(/Projects\s+PROFESSIONAL EXPERIENCE/g, 'Projects');
    
    // Remove any incorrect "PROFESSIONAL EXPERIENCE" text that may have been added to skills or other sections
    html = html.replace(/Projects\s+PROFESSIONAL EXPERIENCE/g, 'Projects');
    
    // Fix any case where "PROFESSIONAL EXPERIENCE" appears at the end of the skills line
    html = html.replace(/Infrastructure Projects\s+PROFESSIONAL EXPERIENCE/g, 'Infrastructure Projects');
    
    // More aggressive cleanup for any pattern where PROFESSIONAL EXPERIENCE is out of place
    html = html.replace(/(Skills:.*?)(PROFESSIONAL EXPERIENCE)(?!\s*SECTION)/g, '$1');
    
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
      
      // Find the skills section using a robust pattern but excluding any section markers
      const skillsPattern = /Skills:[\s\S]*?(?=Languages:|PROFESSIONAL EXPERIENCE(?!\s*SECTION))/;
      const skillsMatch = html.match(skillsPattern);
      
      if (skillsMatch) {
        // We found the skills section, replace it entirely with enhanced skills
        // Apply the proper HTML with the category bold but not the skills themselves
        html = html.replace(skillsPattern, `<span style="font-weight: 600;">Skills:</span> <span style="font-weight: normal;">${comprehensiveSkills}</span>\n\n      `);
        console.log('Applied comprehensive skills replacement via HTML post-processing');
      } else {
        // Fallback: try alternative pattern or direct replacement
        const altPattern = /Skills:(.*?)(?=Languages:|PROFESSIONAL EXPERIENCE(?!\s*SECTION))/;
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
    
    // Clean up formatting of language section - ensure proper standalone formatting
    if (html.includes('Skills:') && html.includes('Languages:')) {
      
      console.log('Formatting language section to separate line with English (Fluent)');
      
      // 1. Fix broken Skills/Languages HTML from post-processing 
      // Ensure the Languages heading is properly on its own line
      html = html.replace(/Skills:[^<]+Languages:/g, (match) => {
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