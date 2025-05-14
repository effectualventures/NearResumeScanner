import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Resume } from '../shared/schema';
import puppeteer from 'puppeteer';

// Base64 encoded Near logo for direct embedding in HTML
const NEAR_LOGO_BASE64 = "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";

/**
 * Generate PDF for the resume with enhanced features and custom formatting
 * @param resume The resume data to format
 * @param sessionId Unique session ID for the PDF
 * @param options Additional PDF generation options
 * @returns Path to the generated PDF file
 */
export async function generateEnhancedPDF(
  resume: Resume,
  sessionId: string,
  options: {
    detailedFormat?: boolean;
    includeAdditionalExperience?: boolean;
    customMargins?: { top: string; right: string; bottom: string; left: string };
  } = {}
): Promise<string> {
  const tempFolder = path.resolve('./temp');
  
  // Create temp folder if it doesn't exist
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }
  
  // Setup template
  const templatePath = path.resolve('./server/templates/resume_v2.html');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  
  // Register Handlebars helpers
  registerHandlebarsHelpers();
  
  // Compile template
  const template = Handlebars.compile(templateSource);
  
  // Log registered helpers for debugging
  const registeredHelpers = Object.keys(Handlebars.helpers).join(', ');
  console.log(`DEBUG: Handlebars helpers registered: ${registeredHelpers}`);
  
  // Generate PDF
  const pdfOutputPath = `${tempFolder}/${sessionId}_v2.pdf`;
  const htmlOutputPath = `${tempFolder}/test_resume_preview_v2.html`;
  
  // Default settings
  const isDetailed = options.detailedFormat || false;
  const includeAdditionalExp = options.includeAdditionalExperience || false;
  
  // Log for debugging
  console.log(`Using ${isDetailed ? 'detailed' : 'standard'} format: ${isDetailed ? 'allowing multi-page layout' : 'optimizing for single page'}`);
  
  try {
    // Get logo path
    const logoFilePath = path.resolve('./public/images/near_logo.png');
    
    // Create template data
    const templateData = {
      ...resume,
      detailedFormat: isDetailed,
      includeAdditionalExp,
      logoPath: logoFilePath
    };
    
    // Render HTML template
    const html = template(templateData);
    
    // Save HTML for debugging
    fs.writeFileSync(htmlOutputPath, html);
    console.log(`Debug HTML file created at: ${htmlOutputPath} - Check this file for rendering issues`);
    
    // Set PDF options
    const pdfOptions = {
      path: pdfOutputPath,
      format: 'Letter',
      printBackground: true,
      margin: options.customMargins || {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.7in',
        left: '0.5in'
      },
      displayHeaderFooter: false,
      headerTemplate: '',
      footerTemplate: '',
    };
    
    // Launch browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    
    // Create page
    const page = await browser.newPage();
    
    // Add logo interceptor for the Near logo to ensure it works
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.includes('near_logo.png')) {
        fs.readFile(logoFilePath, (err, data) => {
          if (err) {
            request.continue();
          } else {
            console.log(`Successfully intercepted and loaded image from: ${logoFilePath}`);
            request.respond({
              status: 200,
              contentType: 'image/png',
              body: data
            });
          }
        });
      } else {
        request.continue();
      }
    });
    
    // Load HTML content
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Add custom footer script - using base64 encoded image for reliability
    await page.evaluate((logoBase64) => {
      try {
        // Create a new footer element with base64 image
        const customFooter = document.createElement('div');
        customFooter.id = 'custom-page-footer';
        customFooter.style.position = 'fixed';  // fixed for single-page
        customFooter.style.display = 'flex';
        customFooter.style.alignItems = 'center';
        customFooter.style.gap = '6px';
        customFooter.style.fontFamily = "'Inter', sans-serif";
        customFooter.style.fontSize = '10px';
        customFooter.style.bottom = '0.35in';
        customFooter.style.right = '0.5in';
        customFooter.style.zIndex = '9999';
        
        // Use base64 image data to ensure it always works
        customFooter.innerHTML = `
          <span><strong>Presented by</strong></span>
          <img src="data:image/png;base64,${logoBase64}" alt="Near logo" style="height: 25px; width: auto;"/>
        `;
        
        // Add footer to body
        document.body.appendChild(customFooter);
        
        // Hide any possible logos within the content
        const logoImages = document.querySelectorAll('.resume-container img');
        for (let i = 0; i < logoImages.length; i++) {
          const img = logoImages[i] as HTMLImageElement;
          const src = img.getAttribute('src');
          if (src && (src.includes('logo') || src.includes('near'))) {
            img.style.display = 'none';
          }
        }
        
        console.log('Custom footer with base64 logo added');
      } catch (err) {
        console.log('Error adding custom footer:', err);
      }
    }, NEAR_LOGO_BASE64);
    
    // Generate PDF
    await page.pdf(pdfOptions);
    
    // Close browser
    await browser.close();
    
    console.log(`🟢 PDF v2 generated with margins ${JSON.stringify(pdfOptions.margin)} and footer locked.`);
    return pdfOutputPath;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Register Handlebars helpers for template rendering
function registerHandlebarsHelpers() {
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

  // Split text into lines
  Handlebars.registerHelper('splitLines', function(text: string) {
    if (!text) return [];
    return text.split('\n');
  });

  // Array slice helper
  Handlebars.registerHelper('slice', function(array: any[], start: number, end: number) {
    if (!array || !Array.isArray(array)) return [];
    return array.slice(start, end);
  });

  // Check if array has some condition true
  Handlebars.registerHelper('some', function(array: any[], condition: (item: any) => boolean) {
    if (!array || !Array.isArray(array)) return false;
    return array.some(condition);
  });
}