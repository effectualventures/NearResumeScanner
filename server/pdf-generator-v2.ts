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
/**
 * Check if the education section is visible in the rendered page
 * @param page Puppeteer page object
 * @returns Boolean indicating if education section is fully visible
 */
async function isEducationSectionVisible(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    const educationSection = document.querySelector('[data-section="education"]');
    if (!educationSection) return false;
    
    // Get the bounding box of the education section
    const rect = educationSection.getBoundingClientRect();
    
    // Check if it's within the viewport
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    return isVisible;
  });
}

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
        
        // Remove single-page class first
        await page.evaluate(() => {
          document.body.classList.remove('single-page');
        }).catch(err => {
          console.log('Non-critical error removing class:', err);
        });
        
        // Add improved style for multi-page format and logo handling as a separate step
        await page.addStyleTag({
          content: `
            /* Set proper body positioning */
            body {
              position: relative;
              page-break-inside: auto;
            }
            
            /* Ensure margin for footer */
            @page {
              margin-bottom: 0.8in !important;
            }
            
            /* Only hide footers that are inside the content container */
            .resume-container footer,
            .resume-container .branding-footer,
            .page-content footer {
              display: none !important;
            }
            
            /* Hide any logos in the content that aren't in the footer */
            img[src*="logo"]:not(#main-footer img),
            img[src*="near"]:not(#main-footer img) {
              display: none !important;
            }
            
            /* Extra spacing around footer */
            .footer-spacing {
              margin-top: 20px;
              height: 0.5in;
              visibility: hidden;
            }
          `
        }).catch(err => {
          console.log('Non-critical error adding styles:', err);
        });
        
        // Position the footer correctly using JavaScript
        await page.evaluate(() => {
          // 1. Find the resume container and the branding footer
          const container = document.querySelector('.resume-container');
          const footer = document.querySelector('.branding-footer');
          
          if (container && footer) {
            // 2. Create a duplicate of the footer that will only show on the last page
            const lastPageFooter = footer.cloneNode(true) as HTMLElement;
            
            // 3. Add a special class to identify it
            lastPageFooter.classList.add('last-page-only-footer');
            
            // 4. Style this footer to ensure it appears at the end of the document
            lastPageFooter.style.display = 'flex';
            lastPageFooter.style.position = 'absolute';
            lastPageFooter.style.bottom = '0.35in';
            lastPageFooter.style.right = '0.5in';
            
            // 5. Append it to the end of the document
            document.body.appendChild(lastPageFooter);
            
            // 6. Hide the original footer
            (footer as HTMLElement).style.display = 'none';
            
            // 7. Add extra space at the bottom of the content to ensure footer doesn't overlap
            const spacer = document.createElement('div');
            spacer.style.height = '0.7in';
            spacer.style.width = '100%';
            spacer.style.visibility = 'hidden';
            container.appendChild(spacer);
          }
        }).catch(err => {
          console.log('Non-critical error positioning footer:', err);
        });
        
        // Before generating PDF, add a custom footer at the bottom of the document
        await page.evaluate(() => {
          try {
            // Get the footer content from the template
            const footerContent = document.querySelector('#main-footer')?.innerHTML;
            
            // Create a new footer element that will be positioned manually
            const customFooter = document.createElement('div');
            customFooter.id = 'custom-page-footer';
            customFooter.style.position = 'absolute';  // absolute instead of fixed
            customFooter.style.display = 'flex';
            customFooter.style.alignItems = 'center';
            customFooter.style.gap = '6px';
            customFooter.style.fontFamily = "'Inter', sans-serif";
            customFooter.style.fontSize = '10px';
            customFooter.style.bottom = '0.35in';
            customFooter.style.right = '0.5in';
            customFooter.style.zIndex = '9999';
            
            if (footerContent) {
              customFooter.innerHTML = footerContent;
            } else {
              // Fallback if footer content not found
              customFooter.innerHTML = `
                <span><strong>Presented by</strong></span>
                <img src="file:///home/runner/workspace/public/images/near_logo.png" alt="Near logo" style="height: 25px; width: auto;"/>
              `;
            }
            
            // Get the resume container
            const resumeContainer = document.querySelector('.resume-container');
            if (resumeContainer) {
              // Add spacing at the end of content to make room for footer
              const spacer = document.createElement('div');
              spacer.style.height = '0.8in';
              spacer.style.width = '100%';
              resumeContainer.appendChild(spacer);
              
              // Add footer after the last element
              document.body.appendChild(customFooter);
            }
            
            // Hide any possible logos within the content
            const logoImages = document.querySelectorAll('.resume-container img');
            for (let i = 0; i < logoImages.length; i++) {
              const img = logoImages[i] as HTMLImageElement;
              const src = img.getAttribute('src');
              if (src && (src.includes('logo') || src.includes('near'))) {
                img.style.display = 'none';
              }
            }
            
            console.log('Custom footer added for multi-page PDF');
          } catch (err) {
            console.log('Error adding custom footer:', err);
          }
        });
        
        // Generate the PDF
        await page.pdf({
          ...pdfOptions,
          scale: 1.0, // Full scale for detailed format
          printBackground: true
        });
      } else {
        // For standard format, we'll use the SAME approach as detailed format 
        // but with scaling to fit on one page if needed
        console.log('Using standard format: optimizing for single page');
        
        // Add single-page class to body
        await page.evaluate(() => {
          // Add single-page class to body for conditional styling
          document.body.classList.add('single-page');
        }).catch(err => {
          console.log('Non-critical error adding class:', err);
        });
        
        // Apply styles for single-page format
        await page.addStyleTag({
          content: `
            /* Configure page size and margins */
            @page { 
              size: letter;
              margin: 0.5in 0.5in 0.7in 0.5in;
            }
            
            /* Contain content to single page */
            body { 
              max-height: 10in !important; /* Slightly less than page height */
              overflow: hidden !important; 
            }
            
            /* Hide all footers in single-page mode too */
            .branding-footer,
            #main-footer,
            #footer-container,
            footer {
              display: none !important;
            }
            
            /* Hide any footer inside the content area */
            .resume-container .branding-footer {
              display: none !important;
            }
            
            /* Hide any logos in the content that aren't in the footer */
            img[src*="logo"]:not(#main-footer img),
            img[src*="near"]:not(#main-footer img) {
              display: none !important;
            }
            
            /* Ensure extra space above footer */
            .logo-zone {
              height: 0.7in !important;
              margin-top: 0.5in !important;
              width: 100% !important;
              clear: both !important;
              display: block !important;
            }
          `
        }).catch(err => {
          console.log('Non-critical error adding style:', err);
        });
        
        // Remove empty elements that might cause spacing issues
        await page.evaluate(() => {
          // Remove any elements that might cause unwanted page breaks
          document.querySelectorAll('div:empty, p:empty').forEach(el => {
            el.remove();
          });
        }).catch(err => {
          console.log('Non-critical error removing empty elements:', err);
        });
        
        // Position the footer correctly using JavaScript
        await page.evaluate(() => {
          // 1. Find the resume container and the branding footer
          const container = document.querySelector('.resume-container');
          const footer = document.querySelector('.branding-footer');
          
          if (container && footer) {
            // 2. Create a duplicate of the footer that will only show on the last page
            const lastPageFooter = footer.cloneNode(true) as HTMLElement;
            
            // 3. Add a special class to identify it
            lastPageFooter.classList.add('last-page-only-footer');
            
            // 4. Style this footer to ensure it appears at the end of the document
            lastPageFooter.style.display = 'flex';
            lastPageFooter.style.position = 'absolute';
            lastPageFooter.style.bottom = '0.35in';
            lastPageFooter.style.right = '0.5in';
            
            // 5. Append it to the end of the document
            document.body.appendChild(lastPageFooter);
            
            // 6. Hide the original footer
            (footer as HTMLElement).style.display = 'none';
            
            // 7. Add extra space at the bottom of the content to ensure footer doesn't overlap
            const spacer = document.createElement('div');
            spacer.style.height = '0.7in';
            spacer.style.width = '100%';
            spacer.style.visibility = 'hidden';
            container.appendChild(spacer);
          }
        }).catch(err => {
          console.log('Non-critical error positioning footer:', err);
        });
        
        // Add custom footer for single-page format
        await page.evaluate(() => {
          try {
            // Get the footer content from the template
            const footerContent = document.querySelector('#main-footer')?.innerHTML;
            
            // Create a new footer element that will be positioned manually
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
            
            if (footerContent) {
              customFooter.innerHTML = footerContent;
            } else {
              // Fallback if footer content not found
              customFooter.innerHTML = `
                <span><strong>Presented by</strong></span>
                <img src="file:///home/runner/workspace/public/images/near_logo.png" alt="Near logo" style="height: 25px; width: auto;"/>
              `;
            }
            
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
            
            console.log('Custom footer added for single-page PDF');
          } catch (err) {
            console.log('Error adding custom footer:', err);
          }
        });
        
        // Check if education section is visible
        const isEducationVisible = await isEducationSectionVisible(page);
        
        // If education section is not visible, we need to progressively remove older experiences
        if (!isEducationVisible && validatedResume.experience.length > 4) {
          console.log('⚠️ Education section is cut off, implementing progressive experience removal...');
          
          // Create a copy of the resume with sorted experiences (newest to oldest)
          let currentExperiences = [...validatedResume.experience];
          
          // Sort experiences by date (assuming startDate or endDate exists)
          // This is a safety precaution in case the experiences aren't already in chronological order
          currentExperiences.sort((a, b) => {
            // Use end date first (Present/Current comes last)
            const aEndDate = a.endDate || '';
            const bEndDate = b.endDate || '';
            
            // Special handling for "Present" or "Current" which should be considered newest
            if (aEndDate.toLowerCase().includes('present') || aEndDate.toLowerCase().includes('current')) {
              return -1; // a is newer
            }
            if (bEndDate.toLowerCase().includes('present') || bEndDate.toLowerCase().includes('current')) {
              return 1; // b is newer
            }
            
            // Otherwise sort by start date if available (newest first)
            const aStartDate = a.startDate || '';
            const bStartDate = b.startDate || '';
            return bStartDate.localeCompare(aStartDate);
          });
          
          let removedExperiences = 0;
          const minExperiences = 4; // We want to keep at least 4 experiences
          
          // Keep removing oldest experiences one by one until education is visible or we reach minimum
          while (currentExperiences.length > minExperiences) {
            // Remove the oldest experience (last in the sorted array)
            currentExperiences.pop();
            removedExperiences++;
            
            // Regenerate HTML with reduced experiences
            const updatedData = {
              ...data,
              experience: currentExperiences
            };
            
            // Generate new HTML with reduced experiences
            const updatedHtml = template(updatedData);
            
            // Update the page content
            await page.setContent(updatedHtml, { waitUntil: 'networkidle0' });
            
            // Re-apply styling
            await page.evaluate(() => {
              document.body.classList.add('single-page');
              
              const footer = document.querySelector('.branding-footer') as HTMLElement | null;
              if (footer) {
                footer.style.bottom = '0.35in';
                footer.style.position = 'fixed';
              }
            });
            
            // Check if education is now visible
            const nowVisible = await isEducationSectionVisible(page);
            if (nowVisible) {
              console.log(`✅ Education section is now visible after removing ${removedExperiences} older experiences`);
              break;
            }
          }
          
          if (removedExperiences > 0) {
            console.log(`📝 Resume optimized by removing ${removedExperiences} older experiences`);
          }
        }
        
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