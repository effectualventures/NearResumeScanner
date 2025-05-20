import { Resume } from '../shared/schema';

/**
 * Enhanced resume text processor
 * Applies multiple transformations to improve resume text quality
 */
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
    
    // Do the same for the Projects section if it exists
    if (processedResume.projects && Array.isArray(processedResume.projects)) {
      processedResume.projects.forEach((project: any) => {
        if (project.description) {
          project.description = project.description.replace(/([a-zA-Z0-9])\s+([A-Z])/g, '$1. $2');
          project.description = project.description.replace(/\.\s*\./g, '.');
        }
        
        if (project.details && Array.isArray(project.details)) {
          project.details.forEach((detail: string, index: number) => {
            if (detail) {
              let fixedDetail = detail.replace(/([a-zA-Z0-9])\s+([A-Z])/g, '$1. $2');
              fixedDetail = fixedDetail.replace(/\.\s*\./g, '.');
              project.details[index] = fixedDetail;
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
    console.error('ERROR enhancing resume text:', error);
    return resume;
  }
}

/**
 * Convert square meters to square feet in all text and metric fields
 * Also standardize currency symbols and numbers
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
        if (edu.institution) edu.institution = convertMetricToImperial(edu.institution);
        if (edu.additionalInfo) edu.additionalInfo = convertMetricToImperial(edu.additionalInfo);
      });
    }
    
    // Process skills section
    if (processedResume.skills && Array.isArray(processedResume.skills)) {
      processedResume.skills.forEach((skillCategory: any) => {
        if (skillCategory.category) {
          skillCategory.category = convertMetricToImperial(skillCategory.category);
        }
        
        if (skillCategory.items && Array.isArray(skillCategory.items)) {
          skillCategory.items = skillCategory.items.map((item: string) => 
            convertMetricToImperial(item)
          );
        }
      });
    }
    
    // Process projects section
    if (processedResume.projects && Array.isArray(processedResume.projects)) {
      processedResume.projects.forEach((project: any) => {
        if (project.name) project.name = convertMetricToImperial(project.name);
        if (project.description) project.description = convertMetricToImperial(project.description);
        
        if (project.details && Array.isArray(project.details)) {
          project.details = project.details.map((detail: string) => 
            convertMetricToImperial(detail)
          );
        }
      });
    }
    
    // Process certifications section
    if (processedResume.certifications && Array.isArray(processedResume.certifications)) {
      processedResume.certifications.forEach((cert: any) => {
        if (cert.name) cert.name = convertMetricToImperial(cert.name);
        if (cert.description) cert.description = convertMetricToImperial(cert.description);
      });
    }
    
    return processedResume;
  } catch (error) {
    console.error('Error normalizing square meters:', error);
    return resume;
  }
}

function convertMetricToImperial(text: string): string {
  if (!text) return text;
  
  // Replace m² with sq ft (approximately)
  // Convert square meters to square feet (1 m² ≈ 10.764 sq ft)
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:m2|m²|sq\.?\s*m|square\s*meters?|square\s*metres?)/gi, (match, num) => {
    const sqMeters = parseFloat(num);
    const sqFeet = Math.round(sqMeters * 10.764);
    return `${sqFeet} sq ft`;
  });
  
  // Convert currencies to USD if possible
  // This is a simplified approximation and should be improved for production
  // Convert € to $ (example rate)
  text = text.replace(/€\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (match, num) => {
    const euros = parseFloat(num.replace(/,/g, ''));
    const dollars = Math.round(euros * 1.1); // Approximate conversion
    return `$${dollars.toLocaleString()}`;
  });
  
  // Convert £ to $ (example rate)
  text = text.replace(/£\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (match, num) => {
    const pounds = parseFloat(num.replace(/,/g, ''));
    const dollars = Math.round(pounds * 1.3); // Approximate conversion
    return `$${dollars.toLocaleString()}`;
  });
  
  return text;
}

/**
 * Standardize location formats to show just Country or State, Country
 */
function standardizeLocations(resume: Resume): Resume {
  if (!resume) return resume;
  
  try {
    // Create a deep copy
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    // Process experience locations
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.location) {
          exp.location = simplifyLocation(exp.location);
        }
      });
    }
    
    // Process education locations
    if (processedResume.education && Array.isArray(processedResume.education)) {
      processedResume.education.forEach((edu: any) => {
        if (edu.location) {
          edu.location = simplifyLocation(edu.location);
        }
      });
    }
    
    return processedResume;
  } catch (error) {
    console.error('Error standardizing locations:', error);
    return resume;
  }
}

function simplifyLocation(location: string): string {
  if (!location) return location;
  
  // Replace "Current" or "current" with "Present" in end dates
  if (location.includes('Current')) {
    location = location.replace(/Current/g, 'Present');
  } else if (location.includes('current')) {
    location = location.replace(/current/g, 'Present');
  }
  
  // Strip out city names from "City, State, Country" or "City, Country"
  const parts = location.split(',').map(part => part.trim());
  
  if (parts.length >= 3) {
    // Format: City, State, Country -> State, Country
    return `${parts[1]}, ${parts[2]}`;
  } else if (parts.length === 2) {
    // Format might be City, Country OR State, Country
    // Simple heuristic: If first part is a major city, return only Country
    const majorCities = ['New York', 'London', 'Tokyo', 'Paris', 'Beijing', 'Mumbai', 
                         'Shanghai', 'São Paulo', 'Mexico City', 'Cairo', 'Manila',
                         'Moscow', 'Berlin', 'Madrid', 'Toronto', 'Sydney', 'Seattle',
                         'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Buenos Aires'];
    
    if (majorCities.some(city => parts[0].includes(city))) {
      return parts[1]; // Just show the Country
    } else {
      return location; // Keep as is, likely already State, Country
    }
  }
  
  return location; // Return as is if format is unrecognized
}

/**
 * Clean up bullet repetition by diversifying starting verbs
 */
function removeBulletRepetition(resume: Resume): Resume {
  if (!resume || !resume.experience) return resume;
  
  try {
    // Create a deep copy of the resume
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 1) {
          // PART 1: Remove repetition within bullets (like "Streamlined operations... streamlined inventory...")
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              // Split bullet into segments based on period/comma followed by space (potential multiple sentences)
              const segments = bullet.text.split(/(?<=[.,])\s+/);
              
              if (segments.length > 1) {
                let cleanedText = segments[0];
                
                // Check each segment for repetition of the starting verb
                const firstSegmentWords = segments[0].split(' ');
                const firstVerb = firstSegmentWords.length > 0 ? firstSegmentWords[0].toLowerCase() : '';
                
                for (let i = 1; i < segments.length; i++) {
                  const currentSegment = segments[i];
                  const currentWords = currentSegment.split(' ');
                  const currentVerb = currentWords.length > 0 ? currentWords[0].toLowerCase() : '';
                  
                  // If the segment starts with the same verb, replace it
                  if (currentVerb === firstVerb && currentVerb.length > 3) {
                    const alternatives = [
                      "Additionally", "Also", "Furthermore", "Moreover", 
                      "This", "The result", "Consequently", "As a result"
                    ];
                    const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
                    
                    // Replace the repeated verb with an alternative transition
                    currentWords[0] = replacement;
                    const modifiedSegment = currentWords.join(' ');
                    
                    cleanedText += '. ' + modifiedSegment;
                  } else {
                    // If no repetition, keep the segment as is
                    cleanedText += '. ' + currentSegment;
                  }
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
          
          // Second pass: replace repeated verbs
          Object.keys(verbCounts).forEach(verb => {
            // If a verb is used more than once, replace all but the first occurrence
            if (verbCounts[verb] > 1) {
              const indexes = verbIndexes[verb];
              
              // Skip the first occurrence, replace others
              for (let i = 1; i < indexes.length; i++) {
                const bulletIndex = indexes[i];
                const bullet = exp.bullets[bulletIndex];
                
                if (bullet && bullet.text) {
                  const words = bullet.text.split(' ');
                  
                  // Generate a list of suitable replacement verbs (avoid already used ones)
                  const availableVerbs = actionVerbs.filter(v => 
                    !Object.keys(verbCounts).includes(v.toLowerCase())
                  );
                  
                  if (availableVerbs.length > 0) {
                    // Pick a random verb from available options
                    const replacement = availableVerbs[Math.floor(Math.random() * availableVerbs.length)];
                    
                    // Replace the first word and update the bullet
                    words[0] = replacement;
                    bullet.text = words.join(' ');
                    
                    // Update our tracking
                    verbCounts[replacement.toLowerCase()] = 1;
                    verbIndexes[replacement.toLowerCase()] = [bulletIndex];
                  }
                }
              }
            }
          });
        }
      });
    }
    
    return processedResume;
  } catch (error) {
    console.error('Error removing bullet repetition:', error);
    return resume;
  }
}

/**
 * Extract significant numbers from a text string
 */
function extractNumbers(text: string): string[] {
  if (!text) return [];
  
  // Match patterns like: 
  // - 15%
  // - $10M
  // - 5.2 million
  // - 3x
  // - 200+ 
  // - $1B
  const matches = text.match(/\$?\d+(?:\.\d+)?(?:\s*%|\s*M|\s*K|\s*B|x|\+|\s*million|\s*billion|\s*thousand)/gi);
  
  return matches || [];
}

/**
 * Get significant words from a string (excluding common stop words)
 */
function getSignificantWords(text: string): string[] {
  if (!text) return [];
  
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'for', 'in', 
                     'on', 'at', 'by', 'with', 'about', 'as', 'into', 'like', 'through',
                     'after', 'over', 'between', 'out', 'from', 'up', 'down', 'is', 'are',
                     'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
                     'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could',
                     'may', 'might', 'must', 'that', 'which', 'who', 'whom', 'this',
                     'these', 'those', 'am', 'im', 'your', 'my', 'his', 'her', 'their',
                     'its', 'our', 'we', 'they', 'i', 'you', 'he', 'she', 'it', 'me',
                     'him', 'us', 'them'];
  
  // Split text into words, filter out stop words, and keep only words longer than 3 chars
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => !stopWords.includes(word) && word.length > 3);
  
  return words;
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
 * Clean up education format
 */
function cleanEducationFormat(resume: Resume): Resume {
  if (!resume || !resume.education) return resume;
  
  try {
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    if (processedResume.education && Array.isArray(processedResume.education)) {
      processedResume.education.forEach((edu: any) => {
        // Fix degree format by removing duplicate school names
        if (edu.degree && edu.institution) {
          // If degree contains the full institution name, simplify it
          if (edu.degree.includes(edu.institution)) {
            edu.degree = edu.degree.replace(edu.institution, '').trim();
            // Clean up any leftover artifacts like "from", "at", etc.
            edu.degree = edu.degree.replace(/^\s*(?:from|at|,|-|in)\s+/i, '').trim();
          }
          
          // Remove trailing commas or periods from degree
          edu.degree = edu.degree.replace(/[,.-]+$/, '');
        }
      });
    }
    
    return processedResume;
  } catch (error) {
    console.error('Error cleaning education format:', error);
    return resume;
  }
}

/**
 * Limit bullet points to specified maximum number
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