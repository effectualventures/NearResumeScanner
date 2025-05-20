import { Resume } from '../shared/schema';

/**
 * Enhanced resume text processor
 * Applies multiple transformations to improve resume text quality
 */
export function enhanceResumeText(resume: Resume): Resume {
  try {
    // Create a deep copy of the resume
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    // Process experience section
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        // Process each bullet point
        if (exp.bullets && Array.isArray(exp.bullets)) {
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              // Find sentences within the bullet text using regex pattern matching
              // Look for lowercase or uppercase letter followed by space and an uppercase letter
              bullet.text = bullet.text.replace(/([a-z])\s+([A-Z])/g, '$1. $2');
              
              // Also look for cases where numbers are followed by capital letters 
              // (likely a new sentence)
              bullet.text = bullet.text.replace(/([0-9])\s+([A-Z])/g, '$1. $2');
            }
          });
        }
      });
    }
    
    // Do the same for the Projects section if it exists
    if (processedResume.projects && Array.isArray(processedResume.projects)) {
      processedResume.projects.forEach((project: any) => {
        if (project.description) {
          project.description = project.description.replace(/([a-z])\s+([A-Z])/g, '$1. $2');
          project.description = project.description.replace(/([0-9])\s+([A-Z])/g, '$1. $2');
        }
        
        if (project.details && Array.isArray(project.details)) {
          project.details.forEach((detail: string, index: number) => {
            if (detail) {
              let fixedDetail = detail.replace(/([a-z])\s+([A-Z])/g, '$1. $2');
              fixedDetail = fixedDetail.replace(/([0-9])\s+([A-Z])/g, '$1. $2');
              project.details[index] = fixedDetail;
            }
          });
        }
      });
    }
    
    return processedResume;
  } catch (error) {
    console.error('Error fixing sentence punctuation:', error);
    return resume;
  }
}

export function enhanceResumeText(resume: Resume): Resume {
  if (!resume) {
    console.error('ERROR: enhanceResumeText received null or undefined resume');
    return resume;
  }
  
  // Log the resume structure before processing
  console.log('BEFORE Text processing, resume type:', typeof resume);
  console.log('BEFORE Text processing, resume keys:', resume ? Object.keys(resume).join(', ') : 'none');
  
  try {
    // Create a deep copy to avoid modifying the original
    const enhancedResume = JSON.parse(JSON.stringify(resume));
    
    // Apply transformations in sequence
    let processedResume = enhancedResume;
    processedResume = normalizeSquareMeters(processedResume);
    processedResume = standardizeLocations(processedResume);
    processedResume = removeBulletRepetition(processedResume);
    processedResume = dedupeMetricEcho(processedResume);
    processedResume = cleanEducationFormat(processedResume);
    processedResume = limitBulletPoints(processedResume);
    
    // Fix missing periods between sentences within bullet points
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.bullets && Array.isArray(exp.bullets)) {
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              // Add periods between sentences (lowercase or uppercase letter followed by space and uppercase letter)
              bullet.text = bullet.text.replace(/([a-zA-Z0-9])\s+([A-Z])/g, '$1. $2');
              
              // Ensure we don't create double periods
              bullet.text = bullet.text.replace(/\.\s*\./g, '.');
              
              // Log for debugging
              console.log('Fixed sentence punctuation in bullet:', bullet.text);
            }
          });
        }
      });
    }
    
    // Log the resume structure after processing
    console.log('AFTER Text processing, resume keys:', 
      processedResume ? Object.keys(processedResume).join(', ') : 'none');
    
    return processedResume;
  } catch (error) {
    console.error('Error enhancing resume text:', error);
    // Return original if any errors occur
    return resume;
  }
}

/**
 * Normalize all square meter references to square feet
 */
function normalizeSquareMeters(resume: Resume): Resume {
  try {
    // Create a deep copy of the resume
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    // Process summary text
    if (processedResume.summary) {
      processedResume.summary = convertMetricToImperial(processedResume.summary);
    }
    
    // Process experience section
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        // Process company and title
        if (exp.company) exp.company = convertMetricToImperial(exp.company);
        if (exp.title) exp.title = convertMetricToImperial(exp.title);
        
        // Process each bullet point
        if (exp.bullets && Array.isArray(exp.bullets)) {
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              bullet.text = convertMetricToImperial(bullet.text);
            }
            
            // Process metrics
            if (bullet.metrics && Array.isArray(bullet.metrics)) {
              bullet.metrics = bullet.metrics.map((metric: string) => 
                convertMetricToImperial(metric)
              );
            }
          });
        }
      });
    }
    
    // Process education section
    if (processedResume.education && Array.isArray(processedResume.education)) {
      processedResume.education.forEach((edu: any) => {
        if (edu.degree) edu.degree = convertMetricToImperial(edu.degree);
        if (edu.additionalInfo) edu.additionalInfo = convertMetricToImperial(edu.additionalInfo);
      });
    }
    
    // Process additional experience
    if (processedResume.additionalExperience) {
      processedResume.additionalExperience = convertMetricToImperial(
        processedResume.additionalExperience
      );
    }
    
    console.log('Square meter normalization complete (v2)');
    return processedResume;
  } catch (error) {
    console.error('Error during square meter normalization:', error);
    return resume;
  }
}

/**
 * Comprehensive metric to imperial conversion utility
 * Handles various formats of square meters, currencies, and other units
 */
function convertMetricToImperial(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // PART 1: SQUARE METER CONVERSION
  
  // Function to convert square meters to square feet
  const convertToSqFt = (match: string, value: string): string => {
    const numericStr = value.replace(/,/g, '');
    const squareMeters = parseFloat(numericStr);
    
    if (!isNaN(squareMeters)) {
      const squareFeet = Math.round(squareMeters * 10.764);
      return `${squareFeet.toLocaleString()} sq ft`;
    }
    
    return `${value} sq ft`;
  };
  
  // First, normalize all Unicode square meter symbols
  result = result.replace(/m²/g, 'm2');
  
  // Complex pattern matching for various square meter formats
  const patterns = [
    // Number followed by m2 with optional spaces
    /(\d[\d,.]*)(?:\s*)m(?:\s*)2\b/gi,
    // Number followed by m² with optional spaces
    /(\d[\d,.]*)(?:\s*)m(?:\s*)²\b/gi,
    // Number followed by sq m with optional spaces
    /(\d[\d,.]*)(?:\s*)sq(?:\s*)m\b/gi,
    // Number followed by sqm
    /(\d[\d,.]*)(?:\s*)sqm\b/gi,
    // Number followed by m2 without space
    /(\d[\d,.]*)m2\b/gi,
    // Number followed by m² without space
    /(\d[\d,.]*)m²\b/gi,
    // Number followed by sqm without space
    /(\d[\d,.]*)sqm\b/gi,
    // Special case for "X+ m2" format
    /(\d[\d,.]*)\+\s*m2/gi,
    // Special case for "X+ m²" format
    /(\d[\d,.]*)\+\s*m²/gi,
    // Special case for "X+ sq m" format
    /(\d[\d,.]*)\+\s*sq\s*m/gi
  ];
  
  // Apply all patterns for number + square meter formats
  patterns.forEach(pattern => {
    result = result.replace(pattern, (match, p1) => {
      // Check if this is a "plus" notation (e.g., "20,000+ m²")
      if (match.includes('+')) {
        const numericStr = p1.replace(/,/g, '');
        const squareMeters = parseFloat(numericStr);
        
        if (!isNaN(squareMeters)) {
          const squareFeet = Math.round(squareMeters * 10.764);
          return `${squareFeet.toLocaleString()}+ sq ft`;
        }
        
        return `${p1}+ sq ft`;
      }
      
      // Standard conversion
      return convertToSqFt(match, p1);
    });
  });
  
  // Replace standalone unit references
  const unitReplacements = [
    [/\bm\s*2\b/gi, 'sq ft'],
    [/\bm\s*²\b/gi, 'sq ft'],
    [/\bm2\b/gi, 'sq ft'],
    [/\bm²\b/gi, 'sq ft'],
    [/\bsqm\b/gi, 'sq ft'],
    [/\bsq\.\s*m\b/gi, 'sq ft'],
    [/\bsquare\s*meters?\b/gi, 'square feet'],
    [/\bsquare\s*m\b/gi, 'square feet']
  ];
  
  unitReplacements.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement as string);
  });
  
  // PART 2: CURRENCY CONVERSION
  // Currency conversion handled separately - implement if needed
  
  return result;
}

/**
 * Standardize location formatting to remove city and keep only State, Country 
 * or just Country
 */
function standardizeLocations(resume: Resume): Resume {
  if (!resume || !resume.experience) return resume;
  
  try {
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.location) {
          // Remove city names from location
          const locationParts = exp.location.split(',').map((part: string) => part.trim());
          
          if (locationParts.length > 1) {
            // Keep only the last parts (state/country)
            exp.location = locationParts.slice(1).join(', ');
          }
          
          // Remove any zip/postal codes
          exp.location = exp.location.replace(/\d{5}(-\d{4})?/g, '').trim();
          exp.location = exp.location.replace(/[A-Z]\d[A-Z] \d[A-Z]\d/g, '').trim();
          
          // Clean up any trailing commas
          exp.location = exp.location.replace(/,\s*$/, '').trim();
        }
      });
    }
    
    console.log('Location formatting standardized');
    return processedResume;
  } catch (error) {
    console.error('Error during location standardization:', error);
    return resume;
  }
}

/**
 * Remove repetition of text after periods in bullet points and
 * diversify starting verbs in bullet points
 */
function removeBulletRepetition(resume: Resume): Resume {
  if (!resume || !resume.experience) return resume;
  
  try {
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.bullets && Array.isArray(exp.bullets)) {
          // PART 1: Fix repetition after periods in bullet points
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              // Split by periods to check for repetition
              const segments = bullet.text.split(/\.\s+/);
              
              if (segments.length > 1) {
                let cleanedText = segments[0];
                
                for (let i = 1; i < segments.length; i++) {
                  const currentSegment = segments[i];
                  const prevSegment = segments[i-1];
                  
                  // Skip if this segment is just repeating previous content
                  // Check for: 1) Full inclusion, 2) Similar content, 3) Exact match
                  if ((prevSegment.includes(currentSegment) && currentSegment.length > 5) || 
                      (currentSegment.includes(prevSegment) && prevSegment.length > 5) ||
                      (currentSegment.length > 10 && 
                       prevSegment.toLowerCase() === currentSegment.toLowerCase())) {
                    continue;
                  }
                  
                  // Add non-repetitive segment
                  cleanedText += '. ' + currentSegment;
                }
                
                // Ensure proper ending punctuation
                if (!cleanedText.endsWith('.') && 
                    !cleanedText.endsWith('!') && 
                    !cleanedText.endsWith('?')) {
                  cleanedText += '.';
                }
                
                bullet.text = cleanedText;
              }
            }
          });
          
          // PART 2: Diversify starting verbs
          // Common action verbs for substitution
          const actionVerbs = [
            "Achieved", "Accelerated", "Analyzed", "Advanced", "Architected",
            "Boosted", "Built", "Championed", "Collaborated", "Conducted", 
            "Coordinated", "Created", "Delivered", "Demonstrated", "Designed", 
            "Developed", "Directed", "Drove", "Established", "Executed", 
            "Expanded", "Facilitated", "Generated", "Implemented", "Improved",
            "Increased", "Launched", "Led", "Managed", "Optimized",
            "Produced", "Reduced", "Streamlined", "Transformed"
          ];
          
          // Track verb usage
          const verbCounts: Record<string, number> = {};
          const verbIndexes: Record<string, number[]> = {};
          
          // First pass: collect starting verbs
          exp.bullets.forEach((bullet: any, index: number) => {
            if (bullet.text) {
              const words = bullet.text.split(' ');
              if (words.length > 0) {
                const firstWord = words[0].toLowerCase();
                if (firstWord.length > 3) {
                  verbCounts[firstWord] = (verbCounts[firstWord] || 0) + 1;
                  
                  if (!verbIndexes[firstWord]) {
                    verbIndexes[firstWord] = [];
                  }
                  verbIndexes[firstWord].push(index);
                }
              }
            }
          });
          
          // Find repeated verbs
          const repeatedVerbs = Object.entries(verbCounts)
            .filter(([verb, count]) => count > 1)
            .map(([verb]) => verb);
          
          // Second pass: replace repeated verbs
          repeatedVerbs.forEach(verb => {
            const indexes = verbIndexes[verb] || [];
            const usedReplacements: string[] = [];
            
            // Keep first occurrence, replace others
            for (let i = 1; i < indexes.length; i++) {
              const bulletIndex = indexes[i];
              
              if (exp.bullets[bulletIndex] && exp.bullets[bulletIndex].text) {
                const text = exp.bullets[bulletIndex].text;
                const words = text.split(' ');
                
                if (words.length > 1) {
                  // Find suitable replacement not already used
                  const availableVerbs = actionVerbs.filter(
                    replacement => replacement.toLowerCase() !== verb && 
                                  !usedReplacements.includes(replacement)
                  );
                  
                  if (availableVerbs.length > 0) {
                    // Choose deterministic replacement based on index
                    const replacement = availableVerbs[
                      bulletIndex % availableVerbs.length
                    ];
                    
                    // Replace first word
                    words[0] = replacement;
                    exp.bullets[bulletIndex].text = words.join(' ');
                    usedReplacements.push(replacement);
                  }
                }
              }
            }
          });
        }
      });
    }
    
    console.log('Removed bullet point repetition (v2)');
    return processedResume;
  } catch (error) {
    console.error('Error removing bullet point repetition:', error);
    return resume;
  }
}

/**
 * Clean up education degree formatting to be more consistent
 */
function cleanEducationFormat(resume: Resume): Resume {
  if (!resume || !resume.education) return resume;
  
  try {
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.education && Array.isArray(processedResume.education)) {
      processedResume.education.forEach((edu: any) => {
        if (edu.degree) {
          // IMPORTANT: We're skipping degree standardization as it's causing issues
          // like "Diploma of Building and Construction" becoming "DiploMaster of Arts of Building and Construction"
          // because "BA" in "Building And" gets replaced with "Bachelor of Arts"
          
          // Just ensure consistent spacing and remove any extraneous whitespace
          let degree = edu.degree.replace(/\s+/g, ' ').trim();
          
          // Make sure full degree titles like "Bachelor of Arts" or "Master of Science" are properly cased
          // but only if they're the complete degree title (using word boundaries \b)
          if (/\bbachelor['']s\s+degree/i.test(degree)) {
            degree = degree.replace(/\bbachelor['']s\s+degree\b/i, "Bachelor's Degree");
          }
          
          if (/\bmaster['']s\s+degree/i.test(degree)) {
            degree = degree.replace(/\bmaster['']s\s+degree\b/i, "Master's Degree");
          }
          
          // Fix any degree abbreviations that are standalone terms (using word boundaries)
          degree = degree.replace(/\bb\.s\.\b|\bbs\b/i, 'B.S.');
          degree = degree.replace(/\bb\.a\.\b|\bba\b/i, 'B.A.');
          degree = degree.replace(/\bph\.d\.\b|\bphd\b/i, 'Ph.D.');
          
          // If the degree is just Architecture, add Bachelor's prefix for clarity
          if (degree.trim().toLowerCase() === 'architecture' || 
              degree.trim().toLowerCase() === 'architecture and urbanism') {
            degree = "Bachelor's Degree in " + degree;
          }
          
          edu.degree = degree;
        }
      });
    }
    
    console.log('Education format cleaned up - safer version');
    return processedResume;
  } catch (error) {
    console.error('Error cleaning education format:', error);
    return resume;
  }
}

/**
 * Limit bullet points to a maximum number
 */
function limitBulletPoints(resume: Resume, maxBullets: number = 7): Resume {
  if (!resume || !resume.experience) return resume;
  
  try {
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > maxBullets) {
          // Prioritize bullets with metrics
          const withMetrics = exp.bullets.filter(
            (b: any) => b.metrics && Array.isArray(b.metrics) && b.metrics.length > 0
          );
          
          const withoutMetrics = exp.bullets.filter(
            (b: any) => !b.metrics || !Array.isArray(b.metrics) || b.metrics.length === 0
          );
          
          // If we have enough bullets with metrics, use those first
          if (withMetrics.length >= maxBullets) {
            exp.bullets = withMetrics.slice(0, maxBullets);
          } else {
            // Otherwise, use all bullets with metrics plus some without
            exp.bullets = [
              ...withMetrics,
              ...withoutMetrics.slice(0, maxBullets - withMetrics.length)
            ];
          }
        }
      });
    }
    
    return processedResume;
  } catch (error) {
    console.error('Error limiting bullet points:', error);
    return resume;
  }
}

/**
 * Remove metrics that duplicate text already in the bullet
 */
function dedupeMetricEcho(resume: Resume): Resume {
  if (!resume || !resume.experience) return resume;
  
  try {
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.bullets && Array.isArray(exp.bullets)) {
          exp.bullets.forEach((bullet: any) => {
            if (!bullet.text || !bullet.metrics || !Array.isArray(bullet.metrics)) {
              // Initialize metrics array if missing
              if (!bullet.metrics) bullet.metrics = [];
              return;
            }
            
            // Filter out metrics that are already in the bullet text
            const originalMetricsCount = bullet.metrics.length;
            
            bullet.metrics = bullet.metrics.filter((metric: string) => {
              if (!metric) return false;
              
              // Extract numerical values from the metric
              const metricNumbers = extractNumbers(metric);
              if (metricNumbers.length === 0) return true; // Keep metrics with no numbers
              
              const bulletText = bullet.text.toLowerCase();
              
              // For each number in the metric, check if it appears in the bullet text
              for (const num of metricNumbers) {
                // If the number appears in the bullet text along with similar contextual words, 
                // consider it a duplicate
                if (bulletText.includes(num)) {
                  // Check for contextual words - get words from metric (minus stop words)
                  const metricWords = getSignificantWords(metric.toLowerCase());
                  
                  // Check if any significant word from the metric appears near the number in the bullet
                  for (const word of metricWords) {
                    if (bulletText.includes(word) && 
                        Math.abs(bulletText.indexOf(word) - bulletText.indexOf(num)) < 30) {
                      // We found the number and a significant word from the metric near each other
                      // This is likely a duplicate
                      return false; 
                    }
                  }
                }
              }
              
              return true; // Keep this metric if no matching pattern was found
            });
            
            if (originalMetricsCount !== bullet.metrics.length) {
              console.log('Removed duplicate metrics from bullet point');
            }
          });
        }
      });
    }
    
    console.log('Removed duplicate metrics that echo bullet text (v2)');
    return processedResume;
  } catch (error) {
    console.error('Error removing duplicate metrics:', error);
    return resume;
  }
}

/**
 * Extract all numbers from a string, preserving decimals and percentages
 */
function extractNumbers(text: string): string[] {
  if (!text) return [];
  
  // Find all numbers including those with decimals, percentages, and with commas
  const matches = text.match(/\d+(?:[,.]\d+)*%?|\d+%?/g);
  if (!matches) return [];
  
  // Clean up and normalize the matches
  return matches.map(m => m.replace(/,/g, ''));
}

/**
 * Get significant words from text (excluding common stop words)
 */
function getSignificantWords(text: string): string[] {
  if (!text) return [];
  
  // Remove currency symbols and special characters
  const cleanText = text.replace(/[$€£¥.,()%]/g, ' ').toLowerCase();
  
  // Split into words and filter out short words and common stop words
  const stopWords = ['and', 'the', 'in', 'of', 'to', 'for', 'with', 'by', 'at', 'from', 'on', 'an', 'a'];
  const words = cleanText.split(/\s+/).filter(word => 
    word.length > 2 && !stopWords.includes(word)
  );
  
  // Remove duplicates using filter instead of Set
  return words.filter((word, index) => words.indexOf(word) === index);
}