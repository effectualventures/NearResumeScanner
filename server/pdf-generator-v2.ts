import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Resume } from '../shared/schema';
import type { PDFOptions as PuppeteerPDFOptions } from 'puppeteer-core';

// Define custom PDF options type
type PDFOptions = Omit<PuppeteerPDFOptions, 'format'> & {
  format?: string | any; // Allow any type to avoid type issues
};

// Register Handlebars helpers (exported for use in debug endpoints)
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
    
    // Special cases that are common metrics patterns
    const findMetricPatterns = [
      // Check for percentage patterns - number + % in the text
      (text: string, metric: string): boolean => {
        const percentMatch = metric.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch && percentMatch[1]) {
          const percentValue = percentMatch[1];
          return text.includes(percentValue + '%') || 
                 text.includes(percentValue + ' %') || 
                 text.includes(percentValue + '% ') ||
                 text.includes(percentValue + ' percent') ||
                 text.includes(percentValue + ' percentage');
        }
        return false;
      },
      
      // Check for currency values - dollar amounts
      (text: string, metric: string): boolean => {
        const dollarMatch = metric.match(/\$(\d+(?:[\.,]\d+)?(?:[KkMmBb])?)/);
        if (dollarMatch && dollarMatch[1]) {
          return text.includes('$' + dollarMatch[1]) || 
                 text.includes('$ ' + dollarMatch[1]) ||
                 text.includes(dollarMatch[1] + ' dollars') ||
                 text.includes('USD ' + dollarMatch[1]);
        }
        return false;
      },
      
      // Check for numbers with K, M, B suffixes
      (text: string, metric: string): boolean => {
        const suffixMatch = metric.match(/(\d+(?:[\.,]\d+)?)\s*([KkMmBb])/);
        if (suffixMatch && suffixMatch[1] && suffixMatch[2]) {
          const num = suffixMatch[1];
          const suffix = suffixMatch[2].toLowerCase();
          return text.includes(num + suffix) || 
                 text.includes(num + ' ' + suffix) ||
                 (suffix === 'k' && text.includes('thousand')) ||
                 (suffix === 'm' && text.includes('million')) ||
                 (suffix === 'b' && text.includes('billion'));
        }
        return false;
      }
    ];
    
    // Check each metric against the bullet text
    return metrics.some(metric => {
      if (!metric) return false;
      const cleanMetric = metric.toLowerCase().trim();
      
      // First check if the entire metric is in the text
      if (lowerText.includes(cleanMetric)) {
        return true;
      }
      
      // Then check for specific patterns
      for (const patternCheck of findMetricPatterns) {
        if (patternCheck(lowerText, cleanMetric)) {
          return true;
        }
      }
      
      // Finally, if the metric has numbers, check for the number with context
      const numbers = cleanMetric.match(/\d+(?:[\.,]\d+)?/g) || [];
      if (numbers.length > 0) {
        // If we find any number that's in both the metric and the text,
        // and the context words around it match, consider it a match
        for (const num of numbers) {
          if (lowerText.includes(num)) {
            // Get the parts of the metric that aren't the number
            const metricContext = cleanMetric.replace(num, ' ').replace(/\s+/g, ' ').trim();
            const contextWords = metricContext.split(' ').filter(w => w.length > 2);
            
            // Look for these context words near the number in the text
            for (const word of contextWords) {
              if (lowerText.includes(word)) {
                return true; // Found a context word and the number
              }
            }
          }
        }
      }
      
      return false; // No match found
    });
  });

  // Split text into lines at new line characters
  Handlebars.registerHelper('splitLines', function(text: string) {
    if (!text) return [];
    return text.split('\\n');
  });

  // Check equality
  Handlebars.registerHelper('eq', function(arg1, arg2) {
    return arg1 === arg2;
  });

  // Logical AND
  Handlebars.registerHelper('and', function() {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
  });

  // Logical NOT
  Handlebars.registerHelper('not', function(value) {
    return !value;
  });

  // Array slice helper
  Handlebars.registerHelper('slice', function(array, start, end) {
    if (!array || !array.length) return [];
    return array.slice(start, end);
  });

  // Helper to check if a property exists in any object of an array
  Handlebars.registerHelper('some', function(array, property, value) {
    if (!array || !array.length) return false;
    return array.some((item: any) => item[property] === value);
  });
}

/**
 * Generate a PDF file from a resume object using the enhanced v2 template
 * @param resume The resume object to convert
 * @param sessionId Unique identifier for the session
 * @param detailedFormat Whether to generate a detailed 2-page format
 * @param includeAdditionalExp Whether to include the additional experience section
 * @returns Path to the generated PDF file
 */
export async function generatePDFv2(
  resume: Resume, 
  sessionId: string, 
  detailedFormat: boolean = false,
  includeAdditionalExp: boolean = true
): Promise<string> {
  try {
    // Register all required helpers
    registerHandlebarsHelpers();
    
    // Read the improved template
    const templatePath = path.resolve(process.cwd(), 'server/templates/resume_v2.html');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    
    // Compile the template
    const template = Handlebars.compile(templateSource);
    
    // Verify and validate resume structure before passing to template
    if (!resume || typeof resume !== 'object') {
      console.error('ERROR: Invalid resume data received:', resume);
      throw new Error('Invalid resume data format');
    }
    
    // Log the resume structure for debugging
    console.log('PDF Generator received resume type:', typeof resume);
    const resumeKeys = Object.keys(resume);
    console.log('PDF Generator received resume keys:', resumeKeys.join(', '));
    
    // Additional check to see if we have all required properties
    const requiredKeys = ['header', 'summary', 'skills', 'experience', 'education'];
    const missingKeys = requiredKeys.filter(key => !resumeKeys.includes(key));
    
    if (missingKeys.length > 0) {
      console.warn('WARNING: Resume data is missing required keys:', missingKeys.join(', '));
      console.log('Raw resume data:', JSON.stringify(resume).substring(0, 500) + '...');
    }

    // Ensure all required fields exist
    const validatedResume = {
      header: resume.header || { 
        firstName: 'Professional',
        tagline: 'Resume',
        location: 'United States'
      },
      summary: resume.summary || 'Experienced professional with a track record of success.',
      skills: Array.isArray(resume.skills) ? resume.skills : [],
      experience: Array.isArray(resume.experience) ? resume.experience : [],
      education: Array.isArray(resume.education) ? resume.education : [],
      additionalExperience: resume.additionalExperience || ''
    };
    
    // Prepare data for template with detailed format flag and additional experience preference
    const data = {
      ...validatedResume,
      detailedFormat,
      includeAdditionalExp,
      logoPath: path.resolve(process.cwd(), 'public/images/near_logo.png')
    };
    
    // Debug the data being passed to template
    console.log('DEBUG: Resume header in template data:', JSON.stringify(data.header, null, 2));
    console.log('DEBUG: Resume skills in template data:', JSON.stringify(data.skills, null, 2));
    console.log('DEBUG: Resume experience count:', data.experience ? data.experience.length : 0);
    
    // More detailed debugging of experience section
    if (data.experience && data.experience.length > 0) {
      console.log('DEBUG: First experience item structure:', 
        JSON.stringify(data.experience[0], null, 2));
    } else {
      console.log('DEBUG: Experience array is empty or invalid');
    }
    
    // Debug template helper registration
    console.log('DEBUG: Handlebars helpers registered:', 
      Object.keys(Handlebars.helpers).join(', '));
    
    // Debug template data that will be passed to Handlebars
    console.log('DEBUG: Full template data keys:', Object.keys(data).join(', '));
    
    // Write complete debug data to file for inspection
    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const debugDataPath = path.join(tempDir, 'template_data_debug.json');
    fs.writeFileSync(debugDataPath, JSON.stringify(data, null, 2));
    console.log(`DEBUG: Complete template data written to ${debugDataPath}`);
    
    // Generate HTML from template
    let html = template(data);
    
    // Save HTML file first (needed for PDF generation and as a fallback)
    const htmlOutputPath = path.join(tempDir, `${sessionId}_v2.html`);
    fs.writeFileSync(htmlOutputPath, html);
    
    // Debug file to check template rendering
    const debugHtmlPath = path.join(tempDir, 'test_resume_preview_v2.html');
    fs.writeFileSync(debugHtmlPath, html);
    console.log(`Debug HTML file created at: ${debugHtmlPath} - Check this file for rendering issues`);
    
    // Attempt to generate PDF with Puppeteer
    try {
      // Dynamically import puppeteer-core for Replit compatibility
      const puppeteerModule = await import('puppeteer-core');
      const puppeteer = puppeteerModule.default;
      
      // Launch browser with robust error handling
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--allow-file-access-from-files',
          '--allow-file-access',
          '--disable-web-security'
        ],
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
      });
      
      const page = await browser.newPage();
      
      // Set up request interception for file:// URLs (critical for logo loading)
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
      
      // Load the content and wait for all resources
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Ensure images have loaded (important for the logo)
      await page.waitForFunction('document.images.length > 0 && Array.from(document.images).every(img => img.complete)');
      
      // Format for US Letter size (8.5" x 11")
      const pdfOutputPath = path.join(tempDir, `${sessionId}_v2.pdf`);
      
      // Configure PDF generation options with exact margins
      const defaultPdfMargins = {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.7in',
        left: '0.5in'
      };
      
      // Configure PDF generation options
      const pdfOptions: PDFOptions = {
        path: pdfOutputPath,
        format: 'letter',
        printBackground: true,
        preferCSSPageSize: true,
        margin: defaultPdfMargins
      };
      
      if (detailedFormat) {
        // For detailed format, allow content to flow to second page
        console.log('Using detailed format: allowing multi-page layout');
        
        // Position the footer at the bottom of the page with absolute positioning
        await page.evaluate(() => {
          // Set the position of the branding footer
          const footer = document.querySelector('.branding-footer') as HTMLElement | null;
          if (footer) {
            footer.style.bottom = '0.35in'; // Position exactly 0.35in from bottom
            footer.style.position = 'absolute'; // Use absolute positioning for better control
          }
        });
        
        await page.pdf({
          ...pdfOptions,
          scale: 1.0 // Full scale for detailed format
        });
      } else {
        // For standard format, we'll use the SAME approach as detailed format 
        // but with scaling to fit on one page if needed
        console.log('Using standard format: optimizing for single page');
        
        // Adjust the footer position to match the detailed format 
        await page.evaluate(() => {
          // Set the position of the branding footer
          const footer = document.querySelector('.branding-footer') as HTMLElement | null;
          if (footer) {
            footer.style.bottom = '0.35in'; // Position exactly 0.35in from bottom
            footer.style.position = 'absolute'; // Use absolute positioning for better control
          }
        });
        
        // Apply special handling to ensure single-page output
        await page.evaluate(() => {
          // Add a style to hide any potential overflow
          const style = document.createElement('style');
          style.textContent = `
            @page { 
              size: letter;
              margin: 0.5in 0.5in 0.7in 0.5in;
            }
            body { 
              max-height: 10in !important; /* Slightly less than page height */
              overflow: hidden !important; 
            }
            .branding-footer {
              position: absolute !important; /* Absolute instead of fixed for better control */
              bottom: 0.35in !important; /* Position exactly 0.35in from bottom */
              right: 0.5in !important;
              z-index: 9999 !important; /* Ensure it stays on top */
            }
            
            /* Ensure extra space above footer */
            .logo-zone {
              height: 0.6in !important; /* Reduced height to save space */
              margin-top: 0.2in !important; /* Further reduced margin for single-page format */
              width: 100% !important;
              clear: both !important;
              display: block !important;
            }
            
            /* Optimize spacing for single-page format */
            .section { margin-bottom: 5px !important; }
            .section-title { margin-top: 10px !important; margin-bottom: 2px !important; }
            section { margin-bottom: 5px !important; }
            .education { margin-bottom: 5px !important; }
            .experience { margin-bottom: 8px !important; }
            li { margin-bottom: 1px !important; line-height: 1.2 !important; }
          `;
          document.head.appendChild(style);
          
          // Remove any elements that might cause unwanted page breaks
          document.querySelectorAll('div:empty, p:empty').forEach(el => {
            el.remove();
          });
        });
        
        // Measure content height for scaling
        const contentHeight = await page.evaluate(() => {
          return document.body.scrollHeight;
        });
        
        // Calculate scale to fit on one page - slightly more aggressive scaling
        const pageHeight = 11 * 96; // Letter height in pixels (11 inches at 96 DPI)
        const availableHeight = pageHeight - 96; // Account for margins
        const scale = contentHeight > availableHeight ? 
                     Math.min(0.97, (availableHeight / contentHeight)) : 
                     1.0; // No scaling if content already fits
        
        console.log(`Content height: ${contentHeight}px, using scale factor: ${scale}`);
        
        // Use PDF options specifically designed to prevent multi-page output
        await page.pdf({
          ...pdfOptions,
          scale: scale, // Scale content to fit on single page
          pageRanges: '1', // Only output the first page
          printBackground: true,
          preferCSSPageSize: false // Use our exact dimensions instead of CSS
        });
      }
      
      await browser.close();
      console.log(`Generated PDF file for resume: ${pdfOutputPath}`);
      console.log(`🟢 PDF v2 generated with margins ${JSON.stringify(defaultPdfMargins)} and footer locked.`);
      
      return pdfOutputPath;
    } catch (pdfError) {
      console.error('Error generating PDF v2, falling back to HTML:', pdfError);
      return htmlOutputPath;
    }
  } catch (error) {
    console.error('Error in PDF generation v2:', error);
    throw error;
  }
}