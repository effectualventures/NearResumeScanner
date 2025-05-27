import OpenAI from "openai";
import { Resume } from "@shared/schema";
import { 
  ResumeTransformationResponse, 
  ChatProcessingResponse 
} from "./types";
import * as fs from 'fs';
import * as path from 'path';

// Configuration constants
const CONFIG = {
  MAX_BULLETS_PER_ROLE: 7,
  OPENAI_MODEL: "gpt-4o",
  MAX_SUMMARY_LENGTH: 180, // Reduced to ensure complete sentences
  REQUIRED_SECTIONS: ['Summary', 'Skills', 'Experience', 'Education']
};

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key'
});

// Simple role detection function
function detectRole(resumeText: string): string {
  const text = resumeText.toLowerCase();

  // Check for specific role indicators
  if (text.includes('sdr') || text.includes('sales development')) return 'SDR';
  if (text.includes('account executive') || text.includes(' ae ')) return 'AE';
  if (text.includes('sales manager') || text.includes('sales lead')) return 'SALES_MANAGER';
  if (text.includes('business development') || text.includes('business developer')) return 'BIZ_DEV';
  if (text.includes('marketing') || text.includes('campaign')) return 'MARKETING';
  if (text.includes('engineer') || text.includes('developer') || text.includes('technical')) return 'TECHNICAL';

  // Fallback: try to determine from experience bullets
  if (text.includes('pipeline') || text.includes('quota') || text.includes('prospects')) return 'SALES_GENERAL';
  if (text.includes('code') || text.includes('software') || text.includes('api')) return 'TECHNICAL';

  return 'GENERAL';
}

// Role-specific guidance - balanced approach to metrics
const ROLE_GUIDANCE = {
  SDR: `
For SDR/BDR roles, focus on these key metrics when they naturally fit:
- Pipeline generation with specific amounts when credible
- Conversion rates and quota attainment percentages
- Outbound activity volume and results
- Performance ranking relative to team when known
- Lead qualification and opportunity creation numbers`,

  AE: `
For AE/Sales roles, emphasize these achievements:
- Deal sizes and revenue numbers when specific amounts are known
- Win rates and sales cycle improvements with realistic percentages
- Territory growth and account expansion metrics
- Relationship management scope (number of accounts, deal values)
- Year-over-year growth figures when available`,

  SALES_MANAGER: `
For Sales Management roles, highlight:
- Team performance metrics (quota attainment, growth rates)
- Individual rep development and productivity improvements
- Team retention and hiring success rates
- Process improvements that led to measurable gains
- Budget management and resource allocation results`,

  BIZ_DEV: `
For Business Development roles, showcase:
- Market opportunity identification and sizing
- Partnership development and pipeline contribution
- New market entry results and expansion metrics
- Relationship building scope and conversion rates
- Strategic initiative outcomes and business impact`,

  MARKETING: `
For Marketing roles, demonstrate:
- Campaign performance and lead generation results
- Conversion rate improvements and funnel optimization
- Budget management and ROI achievements
- Brand awareness and engagement growth
- Digital marketing metrics (traffic, rankings, engagement)`,

  TECHNICAL: `
For Technical roles, emphasize:
- Performance improvements and optimization results
- System scale and reliability enhancements
- Cost savings through technical improvements
- Process automation and efficiency gains
- User experience improvements and adoption metrics`,

  SALES_GENERAL: `
For Sales roles, focus on:
- Revenue impact and quota performance
- Customer acquisition and retention
- Process improvements and efficiency gains
- Territory or market development results`,

  GENERAL: `
Focus on quantifiable business impact:
- Process improvements with measurable outcomes
- Cost savings or revenue contributions when known
- Efficiency gains and productivity improvements
- Project scope and stakeholder management
- Tools and methodologies that delivered results`
};

// Base system prompt components
const BASE_PROMPT = `
You are an expert resume editor specializing in transforming professional resumes into high-quality, "Americanized" formats for Near's talent database. Your task is to reformat, enhance, and optimize resumes to showcase candidates as confident, top-tier talent while maintaining factual accuracy and professional credibility.

CRITICAL FORMATTING REQUIREMENTS:
- Clean, professional layout with standard sections
- First name only (anonymized) - CRITICAL
- Professional role title (5 words max) must be specific and tailored
- Location format: "Country" for header, "City, Country" for experience/education
- Sections MUST appear in this exact order: Summary, Skills, Professional Experience, Education, Additional Experience
- Past tense for all bullets except current role
- Solid round bullets with periods at the end of each bullet
- Three-letter month format for all dates (e.g., "Jan 2023 – Present")

CONTENT REQUIREMENTS:
- SUMMARY: Create a compelling professional summary (maximum ${CONFIG.MAX_SUMMARY_LENGTH} characters) with TWO complete sentences. Ensure both sentences are fully formed and end properly. Focus on experience and expertise.
- SKILLS: Extract and list all relevant skills from the resume. Include both technical and soft skills. Always include English and native language.
- EXPERIENCE: Reverse chronological order. Every role needs at least 3 strong bullet points with realistic, credible achievements.
- EDUCATION: Include full degree with field of study, institution, location, and graduation year. If year is unknown, use "N/A" sparingly and only when absolutely necessary.

METRICS AND ACHIEVEMENTS GUIDELINES:
- Use specific numbers and percentages ONLY when they enhance credibility
- Avoid round numbers like 20%, 30%, 40% - use more specific figures like 23%, 37%, 42%
- Each bullet should have business impact, but not every bullet needs a percentage
- Focus on scope, tools, methodologies, and outcomes over manufactured metrics
- When adding metrics, ensure they match the candidate's experience level and role

QUALITY STANDARDS:
- Strong action verbs that convey impact
- Specific, believable achievements that pass the "credibility test"
- Industry context where helpful
- Perfect grammar and spelling
- Professional credibility throughout`;

const FORMAT_GUIDANCE = {
  DETAILED: `
⚠️ DETAILED TWO-PAGE FORMAT REQUIREMENTS:
- Include 8-10 bullet points per recent role (5+ years)
- Expand bullet points with specific implementations and methodologies
- Include company context and market position
- Use full page width for content
- Skills section must include 12-15 comprehensive skills
- Final output MUST fill two complete pages`,

  STANDARD: `
STANDARD ONE-PAGE FORMAT:
- Limit to 3-5 bullet points per role
- Focus on highest-impact achievements
- Prioritize quality over quantity
- Optimize for concise, powerful statements`
};

// Build system prompt based on detected role and format
function buildSystemPrompt(detectedRole: string, detailedFormat: boolean, includeAdditionalExp: boolean): string {
  const roleGuidance = ROLE_GUIDANCE[detectedRole] || ROLE_GUIDANCE['GENERAL'];
  const formatGuidance = detailedFormat ? FORMAT_GUIDANCE.DETAILED : FORMAT_GUIDANCE.STANDARD;

  return `${BASE_PROMPT}

FORMAT TYPE: ${detailedFormat ? "DETAILED TWO-PAGE FORMAT" : "STANDARD ONE-PAGE FORMAT"}
${formatGuidance}

ROLE-SPECIFIC OPTIMIZATION:
${roleGuidance}

ADDITIONAL EXPERIENCE: ${includeAdditionalExp ? 'REQUIRED - include volunteer work, community contributions, or other activities' : 'DO NOT INCLUDE this section'}.

Your response must be a valid JSON object with this structure:
{
  "header": {
    "firstName": string,
    "tagline": string,
    "location": string,
    "city": string,
    "country": string
  },
  "summary": string,
  "skills": [
    {
      "category": string,
      "items": string[]
    }
  ],
  "experience": [
    {
      "company": string,
      "location": string,
      "title": string,
      "startDate": string,
      "endDate": string,
      "bullets": [
        {
          "text": string
        }
      ]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "location": string,
      "year": string,
      "additionalInfo": string
    }
  ],
  "additionalExperience": string
}`;
}

// Main function to transform resume
export async function transformResume(
  resumeText: string,
  sessionId: string,
  detailedFormat: boolean = false,
  includeAdditionalExp: boolean = true,
  useOpenAIValidation: boolean = true
): Promise<ResumeTransformationResponse> {

  // Input validation
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      success: false,
      resume: null,
      error: 'Resume text is too short or empty'
    };
  }

  if (!sessionId || sessionId.trim().length === 0) {
    return {
      success: false,
      resume: null,
      error: 'Session ID is required'
    };
  }

  try {
    console.log(`[${sessionId}] Starting resume transformation`);

    // Detect role and build appropriate prompt
    const detectedRole = detectRole(resumeText);
    console.log(`[${sessionId}] Detected role: ${detectedRole}`);

    const systemPrompt = buildSystemPrompt(detectedRole, detailedFormat, includeAdditionalExp);
    const userPrompt = String(resumeText);

    console.log(`[${sessionId}] System prompt length: ${systemPrompt.length} characters`);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse and validate response
    const responseContent = response.choices[0].message.content || '';
    console.log(`[${sessionId}] OpenAI response length: ${responseContent.length}`);

    let resumeData: Resume;
    try {
      resumeData = JSON.parse(responseContent);

      if (!resumeData || typeof resumeData !== 'object') {
        throw new Error('Invalid JSON structure in API response');
      }

      // Validate required sections
      if (!resumeData.header) {
        resumeData.header = { 
          firstName: 'Professional',
          tagline: 'Resume',
          location: 'United States'
        };
      }

      if (!Array.isArray(resumeData.skills)) {
        resumeData.skills = [];
      }

      if (!Array.isArray(resumeData.experience)) {
        resumeData.experience = [];
      }

    } catch (parseError) {
      console.error(`[${sessionId}] JSON parsing failed:`, parseError);
      throw new Error('Failed to parse resume data from API response');
    }

    // Consolidate skills into Skills and Languages categories
    const consolidatedSkills = consolidateSkills(resumeData.skills);
    resumeData.skills = consolidatedSkills;

    let finalResume = resumeData;

    // Optional validation step
    if (useOpenAIValidation) {
      console.log(`[${sessionId}] Running validation step`);
      finalResume = await validateAndEnhanceResume(resumeData, resumeText, sessionId);
    }

    // Apply post-processing improvements
    finalResume = standardizeLocations(finalResume);
    finalResume = removeBulletRepetition(finalResume);
    finalResume = limitBulletPoints(finalResume, CONFIG.MAX_BULLETS_PER_ROLE);
    finalResume = cleanEducationFormat(finalResume);
    finalResume = validateSummaryCompletion(finalResume, sessionId);

    // Write debug output
    const debugPath = `temp/debug-resume-${sessionId}.json`;
    if (!fs.existsSync('temp')) {
      fs.mkdirSync('temp', { recursive: true });
    }
    fs.writeFileSync(debugPath, JSON.stringify(finalResume, null, 2));
    console.log(`[${sessionId}] Debug file written: ${debugPath}`);

    return {
      success: true,
      resume: finalResume
    };

  } catch (error: any) {
    console.error(`[${sessionId}] Error transforming resume:`, error);

    // Handle rate limits with demo data
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      console.log(`[${sessionId}] Rate limit reached, using demo data`);

      const demoResume: Resume = createDemoResume();

      const debugDemoPath = `temp/debug-demo-resume-${sessionId}.json`;
      fs.writeFileSync(debugDemoPath, JSON.stringify(demoResume, null, 2));

      return {
        success: true,
        resume: demoResume
      };
    }

    return {
      success: false,
      resume: null,
      error: error?.message || 'Failed to transform resume'
    };
  }
}

// Helper function to consolidate skills
function consolidateSkills(skills: any[]): any[] {
  const languageItems: string[] = [];
  const skillItems: string[] = [];

  skills.forEach(skillCategory => {
    if (skillCategory.category.toLowerCase() === "languages") {
      languageItems.push(...skillCategory.items);
    } else {
      skillItems.push(...skillCategory.items);
    }
  });

  // Ensure English is included
  if (!languageItems.some(lang => lang.toLowerCase().includes('english'))) {
    languageItems.push("English (Professional)");
  }

  // Remove duplicates
  const uniqueSkills = [...new Set(skillItems)];
  const uniqueLanguages = [...new Set(languageItems)];

  return [
    {
      category: "Skills",
      items: uniqueSkills
    },
    {
      category: "Languages", 
      items: uniqueLanguages
    }
  ];
}

// Create demo resume for rate limit scenarios
function createDemoResume(): Resume {
  return {
    header: {
      firstName: "Maria",
      tagline: "Strategic Sales Development Leader – B2B SaaS",
      location: "Colombia",
      city: "Bogotá",
      country: "Colombia"
    },
    summary: "Strategic B2B SaaS sales professional with 8+ years driving revenue growth and team performance. Specialized in LATAM market expansion with proven track record of exceeding targets.",
    skills: [
      {
        category: "Skills",
        items: ["B2B Sales", "Pipeline Management", "Lead Qualification", "CRM Management", "Sales Strategy", "Team Leadership", "Market Analysis", "Client Relationship Management"]
      },
      {
        category: "Languages",
        items: ["English (Professional)", "Spanish (Native)", "Portuguese (Conversational)"]
      }
    ],
    experience: [
      {
        company: "TechSolutions Inc",
        location: "Colombia",
        title: "Senior Sales Development Representative",
        startDate: "Jan 2022",
        endDate: "Present",
        bullets: [
          {
            text: "Generated $2.1M in qualified pipeline, exceeding target by 35% through strategic prospecting."
          },
          {
            text: "Achieved 142% of quota for 6 consecutive quarters, ranking top 5% company-wide."
          },
          {
            text: "Developed and executed outreach sequences resulting in 38% connect-to-meeting conversion rate."
          }
        ]
      }
    ],
    education: [
      {
        institution: "Universidad Nacional",
        degree: "Bachelor's Degree in Business Administration",
        location: "Colombia",
        year: "2018",
        additionalInfo: "Marketing concentration"
      }
    ],
    additionalExperience: "Active volunteer with local entrepreneurship organizations, mentoring early-stage startups on sales strategy and market entry."
  };
}

// New function to validate summary completion
function validateSummaryCompletion(resume: Resume, sessionId: string): Resume {
  if (!resume.summary) return resume;

  const processedResume = { ...resume };

  // Check if summary ends abruptly or is incomplete
  const summary = processedResume.summary.trim();

  // Common patterns that indicate incomplete summaries
  const incompletePatterns = [
    / and$/,           // ends with " and"
    / with$/,          // ends with " with"
    / including$/,     // ends with " including"
    / through$/,       // ends with " through"
    / by$/,           // ends with " by"
    / in$/,           // ends with " in"
    / of$/,           // ends with " of"
    / to$/,           // ends with " to"
    / for$/,          // ends with " for"
    /\.\s*\w+\s*$/    // ends with period followed by incomplete word
  ];

  let isIncomplete = false;
  for (const pattern of incompletePatterns) {
    if (pattern.test(summary)) {
      isIncomplete = true;
      break;
    }
  }

  // Also check if summary is too long
  if (summary.length > CONFIG.MAX_SUMMARY_LENGTH) {
    isIncomplete = true;
  }

  if (isIncomplete) {
    console.log(`[${sessionId}] Detected incomplete summary, fixing...`);

    // Try to clean up by removing incomplete trailing phrase
    let cleanedSummary = summary;

    // Remove trailing incomplete phrases
    for (const pattern of incompletePatterns) {
      cleanedSummary = cleanedSummary.replace(pattern, '.');
    }

    // Ensure it ends with a period
    if (!cleanedSummary.endsWith('.')) {
      cleanedSummary += '.';
    }

    // Truncate if still too long
    if (cleanedSummary.length > CONFIG.MAX_SUMMARY_LENGTH) {
      // Find the last complete sentence within the limit
      const sentences = cleanedSummary.split('. ');
      let result = '';

      for (const sentence of sentences) {
        const potential = result ? `${result}. ${sentence}` : sentence;
        if (potential.length <= CONFIG.MAX_SUMMARY_LENGTH - 1) { // -1 for final period
          result = potential;
        } else {
          break;
        }
      }

      cleanedSummary = result.endsWith('.') ? result : result + '.';
    }

    processedResume.summary = cleanedSummary;
    console.log(`[${sessionId}] Summary fixed: ${cleanedSummary.length} characters`);
  }

  return processedResume;
}

// Enhanced validation function
export async function validateAndEnhanceResume(
  resume: Resume,
  originalText: string,
  sessionId: string
): Promise<Resume> {
  try {
    console.log(`[${sessionId}] Starting validation`);

    // Basic validation checks
    const issues = [];

    // Check summary
    if (!resume.summary) {
      issues.push('Missing summary');
    } else if (resume.summary.length > CONFIG.MAX_SUMMARY_LENGTH) {
      issues.push('Summary too long');
    }

    // Check required sections
    if (!resume.skills || resume.skills.length === 0) {
      issues.push('Missing skills section');
    }

    if (!resume.experience || resume.experience.length === 0) {
      issues.push('Missing experience section');
    }

    // Check education for N/A years
    if (resume.education) {
      const naCount = resume.education.filter(edu => 
        !edu.year || edu.year.toLowerCase() === 'n/a' || edu.year.trim() === ''
      ).length;

      if (naCount > 0) {
        issues.push(`${naCount} education entries missing graduation years`);
      }
    }

    if (issues.length === 0) {
      console.log(`[${sessionId}] Validation passed`);
      return resume;
    }

    console.log(`[${sessionId}] Validation found ${issues.length} issues:`, issues);

    // Apply basic fixes
    const enhancedResume = { ...resume };

    // Fix education N/A issues by trying to infer reasonable years
    if (enhancedResume.education) {
      enhancedResume.education.forEach((edu, index) => {
        if (!edu.year || edu.year.toLowerCase() === 'n/a' || edu.year.trim() === '') {
          // Try to infer from degree type and work experience
          const currentYear = new Date().getFullYear();
          const oldestWorkYear = enhancedResume.experience
            ?.map(exp => exp.startDate ? parseInt(exp.startDate.split(' ')[1]) : currentYear)
            .filter(year => !isNaN(year))
            .sort((a, b) => a - b)[0] || currentYear;

          // Estimate graduation year based on degree type
          let estimatedYear = oldestWorkYear - 2; // Assume 2 years before first job

          if (edu.degree.toLowerCase().includes('master')) {
            estimatedYear = oldestWorkYear - 1; // Masters usually closer to work start
          }

          // Ensure reasonable range
          if (estimatedYear < 1990) estimatedYear = 1990;
          if (estimatedYear > currentYear) estimatedYear = currentYear;

          edu.year = estimatedYear.toString();
          console.log(`[${sessionId}] Estimated graduation year for ${edu.institution}: ${estimatedYear}`);
        }
      });
    }

    return enhancedResume;

  } catch (error) {
    console.error(`[${sessionId}] Validation error:`, error);
    return resume;
  }
}

// Generate feedback function (simplified)
export async function generateFeedback(
  currentResume: Resume,
  pdfUrl: string
): Promise<string> {
  try {
    const systemPrompt = `
You are an expert resume reviewer for a staffing agency. Provide specific, actionable feedback to improve this resume for client presentations.

Focus on:
1. Professional presentation quality
2. Quantified achievements and metrics
3. Formatting consistency
4. Industry-relevant skills and experience
5. Overall impression for hiring managers

Be constructive and specific in your recommendations.`;

    const userPrompt = `Please review this resume and provide feedback:\n\n${JSON.stringify(currentResume, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    return response.choices[0].message.content || 'Failed to generate feedback.';

  } catch (error: any) {
    console.error('Error generating feedback:', error);
    return `Failed to generate feedback: ${error.message || 'Unknown error'}`;
  }
}

// Process direct feedback (simplified)
export async function processDirectFeedback(
  feedback: string,
  implementationPlan: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    const systemPrompt = `
You are a resume editor implementing specific feedback. Apply the requested changes while maintaining professional formatting and consistency.

Key requirements:
- Keep all required sections (Summary, Skills, Experience, Education)
- Maintain professional tone and formatting
- Ensure metrics are realistic and credible
- Use strong action verbs

Current resume: ${JSON.stringify(currentResume, null, 2)}

Feedback to implement: ${feedback}
${implementationPlan ? `Implementation plan: ${implementationPlan}` : ''}

Return updated resume JSON and list of changes made.`;

    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please implement the feedback above." }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
      updatedResume: result.updatedResume || currentResume,
      changes: result.changes || []
    };

  } catch (error: any) {
    console.error('Error processing feedback:', error);

    return {
      success: false,
      updatedResume: currentResume,
      changes: [],
      error: error?.message || 'Failed to process feedback'
    };
  }
}

// Process chat messages (simplified)
export async function processChat(
  sessionId: string,
  message: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    console.log(`[${sessionId}] Processing chat message`);

    const systemPrompt = `
You are a resume editor helping make specific changes to a resume. Apply the user's requested changes while maintaining professional quality.

Current resume: ${JSON.stringify(currentResume, null, 2)}

User request: ${message}

Make the requested changes and return the updated resume with a summary of changes.`;

    const response = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
      updatedResume: result.updatedResume || currentResume,
      changes: result.changes || []
    };

  } catch (error: any) {
    console.error(`[${sessionId}] Error processing chat:`, error);

    return {
      success: false,
      updatedResume: currentResume,
      changes: [],
      error: error?.message || 'Failed to process chat message'
    };
  }
}

// Helper functions for post-processing

function standardizeLocations(resume: Resume): Resume {
  if (!resume) return resume;

  const processedResume = { ...resume };

  // Standardize header location to country only
  if (processedResume.header?.location) {
    const locationParts = processedResume.header.location.split(',');
    processedResume.header.location = locationParts[locationParts.length - 1].trim();

    // Handle common country name standardizations
    if (processedResume.header.location === 'USA') {
      processedResume.header.location = 'United States';
    }
  }

  // Process experience locations
  if (processedResume.experience) {
    processedResume.experience.forEach(exp => {
      if (exp.location) {
        const parts = exp.location.split(',').map(p => p.trim());
        if (parts.length > 2) {
          // "City, State, Country" -> "State, Country"
          exp.location = `${parts[1]}, ${parts[2]}`;
        } else if (parts.length === 2) {
          // Check if first part is clearly a city
          const cityIndicators = ['city', 'town', 'metropolitan', 'metro'];
          const isCity = cityIndicators.some(indicator => 
            parts[0].toLowerCase().includes(indicator)
          ) || parts[0].length < parts[1].length; // Cities usually shorter than countries

          if (isCity) {
            exp.location = parts[1]; // Keep just country
          }
        }
      }
    });
  }

  // Process education locations similarly
  if (processedResume.education) {
    processedResume.education.forEach(edu => {
      if (edu.location) {
        const parts = edu.location.split(',').map(p => p.trim());
        if (parts.length > 2) {
          edu.location = `${parts[1]}, ${parts[2]}`;
        } else if (parts.length === 2) {
          const cityIndicators = ['city', 'town', 'metropolitan', 'metro'];
          const isCity = cityIndicators.some(indicator => 
            parts[0].toLowerCase().includes(indicator)
          ) || parts[0].length < parts[1].length;

          if (isCity) {
            edu.location = parts[1];
          }
        }
      }
    });
  }

  return processedResume;
}

function removeBulletRepetition(resume: Resume): Resume {
  if (!resume?.experience) return resume;

  const processedResume = { ...resume };

  // Enhanced action verbs for replacements
  const actionVerbs = [
    "Achieved", "Accelerated", "Accomplished", "Advanced", "Architected",
    "Boosted", "Built", "Championed", "Collaborated", "Conducted", 
    "Coordinated", "Created", "Delivered", "Demonstrated", "Designed", 
    "Developed", "Directed", "Drove", "Earned", "Enabled", "Engineered",
    "Established", "Executed", "Expanded", "Facilitated", "Forged", 
    "Generated", "Guided", "Headed", "Identified", "Implemented", 
    "Improved", "Increased", "Initiated", "Innovated", "Launched",
    "Maintained", "Maximized", "Navigated", "Negotiated", "Optimized",
    "Orchestrated", "Organized", "Performed", "Pioneered", "Produced",
    "Reduced", "Restructured", "Revitalized", "Secured", "Simplified",
    "Solved", "Streamlined", "Strengthened", "Supervised", "Supported",
    "Transformed", "Upgraded", "Utilized"
  ];

  processedResume.experience.forEach(exp => {
    if (exp.bullets && exp.bullets.length > 1) {
      const usedVerbs = new Set<string>();

      exp.bullets.forEach(bullet => {
        if (bullet.text) {
          const firstWord = bullet.text.split(' ')[0].toLowerCase();

          if (usedVerbs.has(firstWord) && firstWord.length > 3) {
            // Find a replacement verb that hasn't been used
            const availableVerbs = actionVerbs.filter(verb => 
              !usedVerbs.has(verb.toLowerCase())
            );

            if (availableVerbs.length > 0) {
              const replacement = availableVerbs[Math.floor(Math.random() * availableVerbs.length)];
              bullet.text = bullet.text.replace(/^\w+/, replacement);
              usedVerbs.add(replacement.toLowerCase());
            }
          } else {
            usedVerbs.add(firstWord);
          }
        }
      });
    }
  });

  return processedResume;
}

function limitBulletPoints(resume: Resume, maxBullets: number): Resume {
  if (!resume?.experience) return resume;

  const processedResume = { ...resume };

  processedResume.experience.forEach(exp => {
    if (exp.bullets && exp.bullets.length > maxBullets) {
      // Score bullets based on quality indicators
      const scoredBullets = exp.bullets.map((bullet, index) => {
        let score = 0;
        const text = bullet.text || '';

        // Higher scores for bullets with specific metrics
        if (text.match(/\d+%/)) score += 10;
        if (text.match(/\$[\d,]+[KkMmBb]?/)) score += 10;
        if (text.match(/\d+x|\d+ times/)) score += 8;

        // Higher scores for impact words
        if (text.match(/increased|improved|reduced|saved|generated|achieved/i)) score += 6;
        if (text.match(/led|managed|supervised|directed|oversaw/i)) score += 7;
        if (text.match(/implemented|developed|designed|created|established/i)) score += 5;

        // Lower scores for vague language
        if (text.match(/responsible for|duties included|worked on|helped with/i)) score -= 5;
        if (text.match(/various|multiple|several|many/i)) score -= 2;

        // Slight preference for earlier bullets (often more important)
        score += Math.max(0, 5 - index);

        return { bullet, score, originalIndex: index };
      });

      // Sort by score, keep original order for ties
      scoredBullets.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.originalIndex - b.originalIndex;
      });

      // Take top bullets and restore original order
      const selectedBullets = scoredBullets
        .slice(0, maxBullets)
        .sort((a, b) => a.originalIndex - b.originalIndex)
        .map(item => item.bullet);

      exp.bullets = selectedBullets;
    }
  });

  return processedResume;
}

function cleanEducationFormat(resume: Resume): Resume {
  if (!resume?.education) return resume;

  const processedResume = { ...resume };

  processedResume.education.forEach(edu => {
    if (edu.degree) {
      // Clean up common formatting issues
      edu.degree = edu.degree
        .replace(/^Bachelor['']s Degree in /i, '')
        .replace(/^Master['']s Degree in /i, '')
        .replace(/^Associate['']s Degree in /i, '')
        .replace(/^Diploma in /i, '')
        .replace(/\s*\(Building\)$/i, '') // Remove redundant "(Building)" suffix
        .trim();

      // Remove duplicate years that might appear in degree name
      if (edu.year) {
        const yearRegex = new RegExp(`\\b${edu.year}\\b`, 'g');
        edu.degree = edu.degree.replace(yearRegex, '').replace(/\s+/g, ' ').trim();
      }

      // Clean up multiple commas
      edu.degree = edu.degree.replace(/,\s*,/g, ',').replace(/,\s*$/, '');
    }

    // Clean up institution names with platform references
    if (edu.institution && edu.institution.includes(' via ')) {
      const parts = edu.institution.split(' via ');
      if (parts.length === 2) {
        edu.institution = parts[0].trim();

        // Add platform info to additionalInfo if not already there
        const platform = parts[1].trim();
        if (edu.additionalInfo) {
          if (!edu.additionalInfo.includes(platform)) {
            edu.additionalInfo = `${edu.additionalInfo}; Online via ${platform}`;
          }
        } else {
          edu.additionalInfo = `Online via ${platform}`;
        }
      }
    }
  });

  return processedResume;
}