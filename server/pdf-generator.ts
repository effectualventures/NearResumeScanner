import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { Resume } from '@shared/schema';
import Handlebars from 'handlebars';

// Define types locally to avoid errors
type PDFOptions = {
  path: string;
  format: string;
  printBackground: boolean;
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  displayHeaderFooter?: boolean;
  scale?: number;
  preferCSSPageSize?: boolean;
};

// Path to the resume template
const templatePath = path.resolve(process.cwd(), 'server', 'templates', 'resume.html');

// Near logo as Base64 string for embedding
const NEAR_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjM2IiB2aWV3Qm94PSIwIDAgMTIwIDM2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTguMDIyOCAyOC40MTc3TDI5LjcwNzkgMTYuNzMyNkwyOS43MDgzIDE2LjczMjJMMjkuNzA4NCAxNi43MzE3VjE2LjczMDdMMjkuNzA4OSAxNi43MzAxTDI5LjcwOTQgMTYuNzI5NkwyOS44NTQzIDE2LjU4NzlDMzAuNTgwOCAxNS44NjEzIDMwLjU4MDUgMTQuNjkwMyAyOS44NTM1IDEzLjk2NDFDMjkuMTI2NCAxMy4yMzc4IDI3Ljk1NTQgMTMuMjM4MSAyNy4yMjg5IDEzLjk2NDdMMjcuMDg0IDEzLjgyMThMMTUuNjE0NiAyNS4yOTEyTDguMDI1ODUgMTcuNzAyNUw3Ljg4MDk5IDE3LjU1NzZDNy4xNTQ0IDE2LjgzMSA1Ljk4MzQgMTYuODMxNCA1LjI1NzE3IDE3LjU1ODRDNi4xMDM1MiAxNi43MTIxIDQwLjExNzQgNTAuNzI2IDQuNTMwNjggMTcuNTU4MkM0LjUzMDY4IDE3LjU1ODMgNC41MzA1NCAxNy41NTg0IDQuNTMwNCAxNy41NTg2QzQuNTMwMjUgMTcuNTU4NyA0LjUzMDExIDE3LjU1ODkgNC41Mjk5NiAxNy41NTlDMy44MDM4OCAxOC4yODYyIDMuODA0MjEgMTkuNDU3MiA0LjUzMDc3IDE4Ljk5OTRMNi44NzQxOSAyMS4zMDI4TDEzLjQ3OTUgMjcuOTA3OUwxNS42MTQ3IDMwLjA0MzJMMTcuNzQ5OSAyNy45MDgxTDE4LjAyMjUgMjguMTgwN0wxOC4wMjI4IDI4LjQxNzdaIiBmaWxsPSIjMDA3NUZGIi8+CjxwYXRoIGQ9Ik00NC4yMzY3IDE0Ljk3ODJIMzkuNTE2MVYyOC44MjdINDIuMzAyOFYyNS41MjA5SDQ0LjIzNjdDNDcuODQyMiAyNS41MjA5IDUwLjIxODkgMjMuNTE0MiA1MC4yMTg5IDIwLjI0OTVDNTAuMjE4OSAxNi45ODU2IDQ3Ljg0MjkgMTQuOTc4MiA0NC4yMzY3IDE0Ljk3ODJaTTQ0LjA5MzUgMjMuMTQyMUg0Mi4zMDI4VjE3LjM1NzFINDQuMDkzNUM0Ni4yODg2IDE3LjM1NzEgNDcuMzY5MyAxOC40MDUgNDcuMzY5MyAyMC4yNDk1QzQ3LjM2OTMgMjIuMDk0IDQ2LjI4ODYgMjMuMTQyMSA0NC4wOTM1IDIzLjE0MjFaIiBmaWxsPSIjMjMyODJEIi8+CjxwYXRoIGQ9Ik01Ni43OTA5IDIxLjYzNTVDNTYuNzkwOSAyMy4zMzIzIDU1LjY3ODMgMjQuMzQ3OSA1My45MDY4IDI0LjM0NzlDNTIuMTM0NSAyNC4zNDc5IDUxLjAyMTkgMjMuMzMyMyA1MS4wMjE5IDIxLjYzNTVDNTEuMDIxOSAxOS45MzgtNTIuMTM0NSAxOC45MjI0IDUzLjkwNjggMTguOTIyNEM1NS42NzgzIDE4LjkyMjQgNTYuNzkwOSAxOS45MzggNTYuNzkwOSAyMS42MzU1Wk01OS41Nzc2IDIxLjYzNTVDNTkuNTc3NiAxOC41Mjc0IDU3LjI5MjMgMTYuNjAzNSA1My45MDY4IDE2LjYwMzVDNTAuNTIxMyAxNi42MDM1IDQ4LjIzNTIgMTguNTI3NCA0OC4yMzUyIDIxLjYzNTVDNDguMjM1MiAyNC43NDI4IDUwLjUyMTMgMjYuNjY3NSA1My45MDY4IDI2LjY2NzVDNTcuMjkyMyAyNi42Njc1IDU5LjU3NzYgMjQuNzQzNSA1OS41Nzc2IDIxLjYzNTVaIiBmaWxsPSIjMjMyODJEIi8+CjxwYXRoIGQ9Ik02OS4yMzQxIDE5LjE3MDFDNjkuMjM0MSAyMC42NzAxIDY4LjMyOTcgMjEuNTMyIDY2LjY4NzkgMjEuNTMySDY0LjMzNzJWMTYuODA4MUg2Ni42ODc5QzY4LjMyOTcgMTYuODA4MSA2OS4yMzQxIDE3LjY3MDEgNjkuMjM0MSAxOS4xNzAxWk03MSAxOC45NTY3QzcxIDE2LjQ5NSA2OS4xNjc3IDE0Ljk3NzUgNjYuNjQ1NyAxNC45Nzc1SDYyLjQwNzJWMjguODI2M0g2NC4zMzc5VjIzLjM2MzRINjYuNjQ1N0M2OS4xNDY5IDIzLjM2MzQgNzEgMjEuODI0NyA3MSAxOC45NTY3WiIgZmlsbD0iIzIzMjgyRCIvPgo8cGF0aCBkPSJNODYuNTU3OCAyMC4yNjQzQzgwLjg0NDEgMTguODA3OCA4MC41MzggMTguNTM0NiA4MC41MzggMTcuNTk3M0M4MC41MzggMTYuODI0OCA4MS4yMjczIDE2LjMyMjkgODIuNTQ1OSAxNi4zMjI5Qzg0LjE0NDUgMTYuMzIyOSA4NS41MjkzIDE2LjgyMzMgODYuODQ3OSAxNy44MjVMODguNDY3NCAxNi4yNDY2Qzg2LjgyNTYgMTQuOTQ4OCA4NC44NDg3IDE0LjI1NzMgODIuNTQ1OSAxNC4yNTczQzc5LjkyNiAxNC4yNTczIDc3Ljc3MjggMTUuNjM1OCA3Ny43NzI4IDE3Ljc3M0M3Ny43NzI4IDIwLjM3MjUgNzkuNDk5MSAyMS4xMDMgODQuMTI0NSAyMi4yOTM5Qzg4LjA5OTMgMjMuMjkzNSA4OC42ODQxIDIzLjU2NjggODguNjg0MSAyNC41MDQ5Qzg4LjY4NDEgMjUuMzk4OCA4Ny45OTQ3IDI2LjA0OCA4Ni4yNDM3IDI2LjA0OEM4NC4yNjY3IDI2LjA0OCA4Mi41ODg2IDI1LjMzNTEgODEuMTAzMyAyNC4wNTc1TDc5LjM3NDkgMjUuNTM1QzgxLjIyNzMgMjcuMTM0MyA4My41NzEgMjguMTEzNSA4Ni4xODUgMjguMTEzNUM4OS4zNTM1IDI4LjExMzUgOTEuNDQ5MyAyNi43NzczIDkxLjQ0OTMgMjQuMzA5N0M5MS40NDkzIDIxLjU4MTEgODkuNzY0NSAyMC44NzEgODYuNTU3OCAyMC4yNjQzWiIgZmlsbD0iIzIzMjgyRCIvPgo8cGF0aCBkPSJNMTAwLjQ2NSAyMi4yNTE2SDk3LjM1NVYxNi44MDgxSHEwMC40MjNDMTAyLjY3NyAxNi44MDgxIDEwMy44NDYgMTcuODI1IDEwMy44NDYgMTkuNTNDMTAzLjg0NiAyMS4yNTU3IDEwMi43MzYgMjIuMjUxNiAxMDAuNDY1IDIyLjI1MTZaTTEwMC4zMjMgMTQuOTc3NUg5NS40MjQyVjI4LjgyNjNIOTcuMzU1VjI0LjA4MkgxMDAuMzIzQzEwMy42MTIgMjQuMDgyIDEwNS42MyAyMi4yMDk0IDEwNS42MyAxOS41MzAxQzEwNS42MyAxNi44NTA2IDEwMy42MTIgMTQuOTc3NSAxMDAuMzIzIDE0Ljk3NzVaIiBmaWxsPSIjMjMyODJEIi8+CjxwYXRoIGQ9Ik0xMTIuNDY3IDE3LjM3ODlWMjEuNjk5MkgxMDguMTQ2VjE3LjM3ODlIMTA2LjIxNVYyOC44MjYzSDEwOC4xNDZWMjMuNTI5OEgxMTIuNDY3VjI4LjgyNjNIMTE0LjM5OFYxNy4zNzg5SDExMi40NjdaIiBmaWxsPSIjMjMyODJEIi8+CjxwYXRoIGQ9Ik0xMTguMTU2IDE0LjQyMTZDMTE3LjA4NSAxNC40MjE2IDExNi4zOCAxNS4xMjYgMTE2LjM4IDE2LjE5NjhDMTE2LjM4IDE3LjI2NzYgMTE3LjA4NSAxNy45NzIgMTE4LjE1NiAxNy45NzJDMTE5LjIyNyAxNy45NzIgMTE5LjkzMSAxNy4yNjc2IDExOS45MzEgMTYuMTk2OEMxMTkuOTMxIDE1LjEyNiAxMTkuMjI3IDE0LjQyMTYgMTE4LjE1NiAxNC40MjE2WiIgZmlsbD0iIzIzMjgyRCIvPjwvc3ZnPgo=';

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
      margin: {{#if detailedFormat}}0.45in 0.45in{{else}}0.6in 0.5in{{/if}};
      color: #000;
      line-height: {{#if detailedFormat}}1.05{{else}}1.2{{/if}};
      width: 8.5in;
      max-width: 100%;
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
      margin-top: {{#if detailedFormat}}6px{{else}}10px{{/if}};
      margin-bottom: {{#if detailedFormat}}2px{{else}}3px{{/if}};
      color: #000;
      border-bottom: 1px solid #000;
      padding-bottom: {{#if detailedFormat}}0px{{else}}1px{{/if}};
    }
    
    .skills {
      margin-bottom: 8px;
      font-size: 10pt;
    }
    
    .experience {
      margin-bottom: {{#if detailedFormat}}5px{{else}}7px{{/if}};
    }
    
    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0px;
    }
    
    .company {
      font-weight: bold;
    }
    
    .dates {
      text-align: right;
      font-size: 10pt;
    }
    
    .title {
      font-style: italic;
      margin-bottom: 1px;
      font-size: 10pt;
    }
    
    ul {
      margin: {{#if detailedFormat}}1px{{else}}2px{{/if}} 0;
      padding-left: {{#if detailedFormat}}14px{{else}}16px{{/if}};
    }
    
    li {
      margin-bottom: {{#if detailedFormat}}0px{{else}}1px{{/if}};
      font-size: {{#if detailedFormat}}9.5pt{{else}}10pt{{/if}};
      padding-left: 2px;
      line-height: {{#if detailedFormat}}1.05{{else}}1.2{{/if}};
      text-align: justify;
      max-width: 7.5in;
    }
    
    .education {
      margin-bottom: {{#if detailedFormat}}6px{{else}}8px{{/if}};
      font-size: {{#if detailedFormat}}9.5pt{{else}}10pt{{/if}};
    }
    
    .footer {
      position: fixed;
      bottom: {{#if detailedFormat}}0.3in{{else}}0.4in{{/if}};
      right: 0.5in;
      text-align: right;
      width: 100%;
    }
    
    .footer img {
      height: 18px;
      opacity: 0.85;
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
  
  <div class="section-title">SKILLS AND INTERESTS</div>
  <div class="skills">
    {{#each skills}}
      {{#if (eq category "Skills")}}
        <span style="font-weight: 600;">{{category}}:</span> {{#each this.items}}{{#if @first}}{{this}}{{else}}; {{this}}{{/if}}{{/each}}{{#if @last}}{{else}} | {{/if}}
      {{/if}}
      {{#if (eq category "Tools")}}
        <span style="font-weight: 600;">{{category}}:</span> {{#each this.items}}{{#if @first}}{{this}}{{else}}; {{this}}{{/if}}{{/each}}{{#if @last}}{{else}} | {{/if}}
      {{/if}}
      {{#if (eq category "Certifications")}}
        <span style="font-weight: 600;">{{category}}:</span> {{#each this.items}}{{#if @first}}{{this}}{{else}}; {{this}}{{/if}}{{/each}}{{#if @last}}{{else}} | {{/if}}
      {{/if}}
      {{#if (eq category "Languages")}}
        <span style="font-weight: 600;">{{category}}:</span> {{#each this.items}}{{#if @first}}{{this}}{{else}}; {{this}}{{/if}}{{/each}}
      {{/if}}
    {{/each}}
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
    <img src="${NEAR_LOGO_BASE64}" alt="Near Logo">
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
    
    // Pass the detailed format flag to the template
    const html = template({
      ...resume,
      detailedFormat: detailedFormat
    });
    
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
      // Try to launch browser with more robust error handling
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        headless: true
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Format for US Letter size (8.5" x 11")
      const pdfOutputPath = path.join(tempDir, `${sessionId}.pdf`);
      // Configure PDF generation options
      const pdfOptions: PDFOptions = {
        path: pdfOutputPath,
        format: 'letter',
        printBackground: true,
        margin: detailedFormat 
          ? {
            // Extremely narrow margins for detailed format to maximize content
            top: '0.45in',
            right: '0.45in',
            bottom: '0.45in',
            left: '0.45in'
          } 
          : {
            // Standard margins for one-page format
            top: '0.6in',
            right: '0.5in',
            bottom: '0.6in',
            left: '0.5in'
          }
      };
      
      // For detailed format, allow multiple pages
      if (detailedFormat) {
        await page.pdf({
          ...pdfOptions,
          displayHeaderFooter: false, 
          scale: 1.0, // Full scale for more detailed content
          preferCSSPageSize: false // Allow content to flow to multiple pages as needed
        });
      } else {
        // For standard format, try to fit on one page
        await page.pdf({
          ...pdfOptions,
          scale: 0.98 // Slightly scale down to fit on one page
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
