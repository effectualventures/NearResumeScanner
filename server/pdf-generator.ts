import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { Resume } from '@shared/schema';
import Handlebars from 'handlebars';

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
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      margin: 0.7in;
      color: #333;
      line-height: 1.3;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
    }
    
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    
    .header p {
      margin: 2px 0;
      color: #666;
    }
    
    .divider {
      border-top: 1px solid #000;
      margin: 10px 0 15px 0;
    }
    
    .summary {
      margin-bottom: 15px;
      font-weight: 400;
    }
    
    .section-title {
      text-transform: uppercase;
      font-weight: bold;
      font-size: 10pt;
      margin-top: 15px;
      margin-bottom: 5px;
      color: #000;
    }
    
    .skills {
      margin-bottom: 15px;
      font-size: 10pt;
    }
    
    .experience {
      margin-bottom: 12px;
    }
    
    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    
    .company {
      font-weight: bold;
    }
    
    .dates {
      color: #666;
      font-size: 10pt;
    }
    
    .title {
      font-style: italic;
      color: #666;
      margin-bottom: 5px;
    }
    
    ul {
      margin: 5px 0;
      padding-left: 20px;
    }
    
    li {
      margin-bottom: 3px;
      font-size: 10pt;
    }
    
    .education {
      margin-bottom: 15px;
    }
    
    .footer {
      position: absolute;
      bottom: 0.4in;
      right: 0.7in;
      text-align: right;
    }
    
    .footer img {
      height: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{header.firstName}}</h1>
    <p>{{header.tagline}}</p>
    <p>{{header.location}}</p>
  </div>
  
  <div class="divider"></div>
  
  <div class="summary">
    {{summary}}
  </div>
  
  <div class="section-title">SKILLS & TOOLS</div>
  <div class="skills">
    {{#each skills}}
      {{this.category}} | {{this.items.[0]}}{{#each (slice this.items 1)}} • {{this}}{{/each}}
    {{/each}}
  </div>
  
  <div class="section-title">PROFESSIONAL EXPERIENCE</div>
  {{#each experience}}
    <div class="experience">
      <div class="experience-header">
        <div class="company">{{company}} — {{location}}</div>
        <div class="dates">{{startDate}} – {{endDate}}</div>
      </div>
      <div class="title">{{title}}</div>
      <ul>
        {{#each bullets}}
          <li>{{text}}</li>
        {{/each}}
      </ul>
    </div>
  {{/each}}
  
  <div class="section-title">EDUCATION</div>
  <div class="education">
    {{#each education}}
      <div>{{institution}} — {{degree}}, {{location}}, {{year}}</div>
      {{#if additionalInfo}}<div>{{additionalInfo}}</div>{{/if}}
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
  return arr.slice(start, end);
});

// Helper to break summary into multiple lines (max 90 chars)
Handlebars.registerHelper('breaklines', function(text) {
  if (!text) return '';
  
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
 * @returns Path to the generated HTML file (as a temporary workaround for PDF generation)
 */
export async function generatePDF(resume: Resume, sessionId: string): Promise<string> {
  try {
    // Read template
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    
    // Render HTML
    const html = template(resume);
    
    // Ensure temp directory exists
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Instead of generating a PDF (which requires puppeteer/chrome),
    // we'll save the HTML file directly as a temporary solution
    const outputPath = path.join(tempDir, `${sessionId}.html`);
    fs.writeFileSync(outputPath, html);
    
    console.log(`Generated HTML file for resume: ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error('Error generating resume file:', error);
    throw new Error(`Failed to generate resume file: ${error?.message || 'Unknown error'}`);
  }
}
