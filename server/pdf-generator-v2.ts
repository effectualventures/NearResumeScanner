import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Resume } from '../shared/schema';
import type { PDFOptions as PuppeteerPDFOptions } from 'puppeteer-core';

// Define custom PDF options type
type PDFOptions = Omit<PuppeteerPDFOptions, 'format'> & {
  format?: string | any;
};

// Register Handlebars helpers (truncated here for brevity)
export function registerHandlebarsHelpers() {
  // Format end date helper (replaces "Current" with "Present")
  Handlebars.registerHelper('formatEndDate', function(endDate: string) {
    if (!endDate) return '';
    return endDate.toLowerCase() === 'current' ? 'Present' : endDate;
  });

  // Check if a string ends with specific character
  Handlebars.registerHelper('endsWith', function(str: string, suffix: string) {
    if (!str) return false;
    return str.endsWith(suffix);
  });

  // Check if a string contains a substring
  Handlebars.registerHelper('contains', function(str: string, substring: string) {
    if (!str) return false;
    return str.includes(substring);
  });

  // Check if any of the metrics appears in the text - simple robust approach
  Handlebars.registerHelper('containsAny', function(text: string, metrics: string[]) {
    if (!text || !metrics || !metrics.length) return false;
    
    // Convert text to lowercase for case-insensitive comparison
    const lowerText = text.toLowerCase();
    
    // Check if any metric is contained in the text
    return metrics.some(metric => lowerText.includes(metric.toLowerCase()));
  });

  // Split text into lines
  Handlebars.registerHelper('splitLines', function(text: string) {
    if (!text) return [];
    return text.split('\n');
  });

  // Check if strings are equal
  Handlebars.registerHelper('eq', function(a: any, b: any) {
    return a === b;
  });

  // Logical AND helper
  Handlebars.registerHelper('and', function() {
    return Array.prototype.every.call(arguments, Boolean);
  });

  // Logical NOT helper
  Handlebars.registerHelper('not', function(value: any) {
    return !value;
  });

  // Array slice helper
  Handlebars.registerHelper('slice', function(array: any[], start: number, end: number) {
    if (!array || !Array.isArray(array)) return [];
    return array.slice(start, end);
  });

  // Check if array has some condition true
  Handlebars.registerHelper('some', function(array) {
    // Get all arguments except the options hash
    const args = Array.prototype.slice.call(arguments, 0, -1);
    const array1 = args[0];
    
    if (!array1 || !Array.isArray(array1)) return false;
    
    // In Handlebars context, we can't pass actual functions as arguments
    // So we just check if any item exists
    return array1.length > 0;
  });
}

export async function generatePDFv2(
  resume: Resume,
  sessionId: string,
  detailedFormat: boolean = false,
  includeAdditionalExp: boolean = true
): Promise<string> {
  try {
    registerHandlebarsHelpers();

    const templatePath = path.resolve(process.cwd(), 'server/templates/resume_v2.html');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    const validatedResume = {
      header: resume.header || {
        firstName: 'Professional',
        tagline: 'Resume',
        location: 'United States',
      },
      summary: resume.summary || 'Experienced professional with a track record of success.',
      skills: Array.isArray(resume.skills) ? resume.skills : [],
      experience: Array.isArray(resume.experience) ? resume.experience : [],
      education: Array.isArray(resume.education) ? resume.education : [],
      additionalExperience: resume.additionalExperience || '',
    };

    // Embed logo as base64
    const logoBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/images/near_logo.png'));
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

    const data = {
      ...validatedResume,
      detailedFormat,
      includeAdditionalExp,
      logoPath: logoBase64,
    };

    const html = template(data);
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const htmlOutputPath = path.join(tempDir, `${sessionId}_v2.html`);
    fs.writeFileSync(htmlOutputPath, html);

    try {
      const puppeteerModule = await import('puppeteer-core');
      const puppeteer = puppeteerModule.default;
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.waitForFunction(
        'document.images.length > 0 && Array.from(document.images).every(img => img.complete)'
      );
      
      // Add the "Presented by Near" footer at the bottom center of the last page
      await page.evaluate(() => {
        try {
          // Create a centered footer element
          const footerElement = document.createElement('div');
          footerElement.innerText = 'Presented by Near';
          footerElement.style.position = 'fixed';
          footerElement.style.bottom = '0.1in';
          footerElement.style.left = '0';
          footerElement.style.right = '0';
          footerElement.style.textAlign = 'center';
          footerElement.style.fontFamily = "'Inter', sans-serif";
          footerElement.style.fontSize = '10px';
          footerElement.style.fontWeight = 'bold';
          footerElement.style.color = '#333333';
          footerElement.style.zIndex = '9999';
          
          // Add the footer to the document
          document.body.appendChild(footerElement);
          console.log('Added "Presented by Near" footer');
        } catch (error) {
          console.error('Error adding footer:', error);
        }
      });

      const pdfOutputPath = path.join(tempDir, `${sessionId}_v2.pdf`);
      const pdfOptions: PDFOptions = {
        path: pdfOutputPath,
        format: 'letter',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.7in',
          left: '0.5in',
        },
      };

      await page.pdf(pdfOptions);
      await browser.close();
      return pdfOutputPath;
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return htmlOutputPath;
    }
  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw error;
  }
}
