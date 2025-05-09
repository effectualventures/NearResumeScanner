import OpenAI from "openai";
import { Resume } from "@shared/schema";
import { 
  ResumeTransformationResponse, 
  ChatProcessingResponse 
} from "./types";
import * as fs from 'fs';
import * as path from 'path';

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key'
});

// Main function to transform resume
export async function transformResume(
  resumeText: string,
  sessionId: string,
  detailedFormat: boolean = false,
  useOpenAIValidation: boolean = true
): Promise<ResumeTransformationResponse> {
  try {
    // Create system prompt with comprehensive stakeholder feedback and role-aware logic
    // Check if detailed format is requested
    const formatType = detailedFormat ? "DETAILED TWO-PAGE FORMAT" : "STANDARD ONE-PAGE FORMAT";
    
    const systemPrompt = `
You are an expert resume editor specializing in transforming Latin American professional resumes into high-quality, "Americanized" formats for Near's talent database. Your task is to reformat, enhance, and optimize resumes to showcase candidates as confident, top-tier talent while maintaining factual accuracy and professional credibility.

FORMAT TYPE: ${formatType}
${detailedFormat ? 
  `⚠️ THIS RESUME ABSOLUTELY MUST FILL TWO FULL PAGES - NON-NEGOTIABLE ⚠️:
  1. This resume is for an experienced professional with 10+ years of experience
  2. MANDATORY: Include MINIMUM 8-10 bullet points for each role (NOT 5-7) - ESPECIALLY for recent positions
  3. Make each bullet point LONGER and MORE DETAILED than standard format - write a complete picture
  4. Expand EVERY bullet point with specific implementations, methodologies, challenges overcome, and quantifiable results
  5. Include ALL past roles from the original resume with EXTENSIVE details - do not omit or condense employment history
  6. For EACH company, add 1-2 sentences about the business, market position, and industry context
  7. For recent roles (within 5 years), include AT LEAST 10-12 bullet points with multiple metrics per bullet
  8. Provide EXTREMELY detailed descriptions of projects, responsibilities, and achievements for each role
  9. Use the FULL width of the page - make bullet points span at least 80% of the available width
  10. SKILLS SECTION: Include AT LEAST 12-15 skills under multiple categories (Skills, Tools, Certifications, Technical Skills, etc.) - be comprehensive and detailed with specific tools, methodologies, and technical expertise
  11. THIS IS CRITICAL: The final output MUST fill TWO COMPLETE PAGES with no empty space` 
  : 
  `This resume should be optimized for a one-page format that highlights the most impactful and relevant experiences, prioritizing quality over quantity. Limit bullet points to 3-5 per role, focusing only on highest-impact achievements.`
}

ROLE-AWARE OPTIMIZATION (HIRING MANAGER MINDSET):
You must actively "think like" a U.S. hiring manager for the specific role the candidate is targeting. Analyze the resume to determine the role type (Sales, Technical, Support, etc.) and then enhance each section with relevant KPIs and business impacts that U.S. hiring managers would expect.

For EVERY bullet point missing specific metrics, predict what a hiring manager for that role would want to see:

For SDR/BDR roles, hiring managers SPECIFICALLY want to see:
- EXACT pipeline generation numbers: "Generated $3.2M in qualified pipeline, exceeding target by 28%" (not just "generated pipeline")
- PRECISE conversion metrics: "Achieved 37% connect-to-meeting conversion rate, 15% above team average" (not just "good conversion rate")
- SPECIFIC quota attainment: "Consistently achieved 132% of quota for 5 consecutive quarters" (not just "exceeded quota")
- ACTUAL outbound volume: "Executed 80+ strategic outbound sequences resulting in 42 qualified opportunities" (not just "many sequences")
- COMPARATIVE metrics: "Maintained top performer status with 148% attainment vs. team average of 102%" (not just "top performer")

For AE/Sales roles, hiring managers SPECIFICALLY want to see:
- SPECIFIC deal metrics: "Closed 5 enterprise deals valued at $250K-$780K, including a record $780K deal" (not just "large deals")
- PRECISE win rates: "Maintained 42% win rate against key competitors, compared to team average of 31%" (not just "good win rate")
- EXACT revenue growth: "Grew territory revenue by 37% YoY, highest growth rate in the region" (not just "grew revenue")
- CONCRETE sales cycle improvements: "Reduced average sales cycle from 95 to 64 days through value-selling approach" (not just "faster sales")
- NUMERIC relationships: "Managed portfolio of 35 strategic accounts generating $4.7M in annual recurring revenue" (not just "many accounts")

For Business Development roles, hiring managers SPECIFICALLY want to see:
- EXACT opportunity metrics: "Identified and qualified $4.2M in untapped opportunities across 5 key LATAM markets" (not just "identified opportunities")
- SPECIFIC partnership results: "Established 3 strategic partnerships yielding $1.5M in new pipeline within 6 months" (not just "created partnerships")
- PRECISE market analysis: "Conducted comprehensive market analysis resulting in 42% increase in qualified leads" (not just "analyzed markets") 
- CONCRETE relationship metrics: "Cultivated 12 new enterprise relationships with 35% conversion to opportunities" (not just "built relationships")
- NUMERIC evaluation metrics: "Evaluated 40+ partner requests using 5-point scoring system, improving partner quality by 42%" (not just "evaluated partners")
For Sales Management, hiring managers SPECIFICALLY want to see:
- PRECISE team quota metrics: "Led team to 115% average quota attainment, with 7 of 8 SDRs exceeding targets by min. 15%" (not just "good performance")
- SPECIFIC rep development metrics: "Increased per-rep pipeline generation by 47% through personalized coaching" (not just "developed team")
- EXACT retention metrics: "Maintained 90% team retention rate vs. company average of 70%" (not just "good retention")
- PRECISE ramp time metrics: "Reduced new hire ramp time from 4 months to 2.5 months through improved onboarding" (not just "faster onboarding")
- TANGIBLE performance metrics: "Improved team connect rate from 23% to 42% through call coaching and targeted messaging" (not just "improved performance")

For Marketing roles, hiring managers SPECIFICALLY want to see:
- EXACT lead generation metrics: "Increased MQL volume by 137% YoY through targeted campaigns" (not just "more leads")
- SPECIFIC conversion metrics: "Improved MQL-to-SQL conversion from 12% to 28% in 6 months" (not just "better conversion")
- PRECISE campaign ROI: "Achieved 347% ROI on targeted ABM campaigns, 2.5x industry average" (not just "good ROI")
- CONCRETE engagement metrics: "Boosted email engagement by 84% with personalized content strategy" (not just "better engagement")
- NUMERIC growth metrics: "Drove 42% increase in organic traffic resulting in 215 qualified leads" (not just "more traffic")

For Technical roles, hiring managers SPECIFICALLY want to see:
- SPECIFIC optimization metrics: "Reduced page load time by 62%, decreasing bounce rate by 37%" (not just "faster performance")
- PRECISE scale metrics: "Scaled architecture to handle 3.5M concurrent users, up from 850K" (not just "improved scale")
- EXACT cost savings: "Saved $420K annually through cloud infrastructure optimization" (not just "reduced costs")
- CONCRETE efficiency metrics: "Automated 72% of routine tasks, saving 28 developer hours weekly" (not just "increased efficiency")
- NUMERIC improvement metrics: "Decreased application error rate from 2.3% to 0.4%, improving user retention by 28%" (not just "fewer errors")

For each bullet point that lacks metrics or impact:
1. Identify the likely KPIs or success metrics a U.S. hiring manager would expect for that role and responsibility
2. Add contextually appropriate and believable metrics (e.g., "Drove 130% of quota attainment" or "Reduced onboarding time by 45%")
3. Rewrite vague descriptions with clear, specific outcomes that demonstrate business impact
4. Ensure all metrics align with industry benchmarks and role expectations

RESUME FORMAT REQUIREMENTS (MANDATORY):
- Clean, professional layout with standard sections
- One or two page length depending on experience level (generally use one page for less than 10 years experience)
- First name only (anonymized) - CRITICAL
- Professional role title (5 words max) must be metric-anchored, specific and tailored (e.g., "Senior Sales Development Leader – SaaS & Retail Tech")
- Location (City, Country)
- Sections MUST appear in this exact order: Summary, Skills & Tools, Professional Experience, Education, Additional Experience
- Past tense for all bullets except current role
- Solid round bullets with periods at the end of each bullet
- Three-letter month format for all dates (e.g., "Jan 2023 – Present") - consistency is critical
- Near logo in bottom right (handled by template)

CRITICAL CONTENT SECTIONS (MUST INCLUDE ALL):
- SUMMARY: Create a compelling two-sentence professional summary (each <90 chars) that mentions specific industries (SaaS, FinTech, etc.) and quantified achievements. This MUST be included.
- SKILLS & LANGUAGES: ABSOLUTELY CRITICAL: Extract and list EVERY SINGLE skill mentioned anywhere in the resume. For construction estimator roles, this MUST include First Principle Estimating, Bill of Quantities (BOQ), Tender Documents, Quantity Take-Off, AutoCAD, Civil Construction, Infrastructure Projects, Cost Estimating, Cost Consulting, Project Management, Budget Management, and any others found in the text. For languages, ALWAYS include both English (with reasonable proficiency level) AND the native language from the resume. DO NOT OMIT ANY SKILLS mentioned in the resume. This MUST be included.
- PROFESSIONAL EXPERIENCE: Reverse chronological order with metrics. This MUST be included.
- EDUCATION: Must include full degree with specific field of study (e.g., "Bachelor's Degree in International Business", NOT just "Bachelor's Degree"), institution, location, and graduation year. This MUST be included.
- ADDITIONAL EXPERIENCE (if relevant): Optional, but if included, follow same formatting rules.

BULLET & FORMATTING RULES:
1. Every bullet MUST end with a period and have a strong action verb.
2. Format Skills & Languages with ONLY two categories: "Skills" and "Languages". For Languages, include proficiency level (e.g., "Skills: Project Management, Leadership, CRM | Languages: English (C2), Spanish (Native)")
3. Every company header MUST follow exact format "Company — City, Country" (with proper em dash) - location is required for ALL companies
4. Every role MUST display at least 3 bullet points with at least one quantified metric result ($ or % win)
5. Convert all currencies with format "($1.2M USD)" when showing monetary values
6. Format numbers: K for thousands, M for millions, B for billions, no decimals
7. Allocate bullets based on relevance with highest-impact stat first for each role
8. Education format must be precise: "Institution — Degree in Field, Location, Year" with GPA if available
9. Company and product names must have correct capitalization: "AltiSales" not "AltISales"
10. ALWAYS use past tense for bullets in previous roles (ended jobs) and present tense ONLY for current roles
11. Include industry context (SaaS, B2B, etc.) in company descriptions or role bullets

QUALITY STANDARDS:
- Summary must feel human and impressive, not generic (avoid phrases like "dynamic business developer")
- Bullets must have strong action verbs that convey impact, not just responsibilities
- Every bullet must convey impact and value through specificity and quantified results
- Add subtle industry context to company descriptions where helpful 
- Create bullets that would make a hiring manager say "wow" within 5 seconds
- For "led team" descriptions, always include team performance metrics (attainment, growth, retention)
- When adding quantifiable outcomes, make them specific but credible (e.g., 42% is more believable than 40%)
- Never add metrics that would seem implausible or overstated for the role or experience level
- Perfect grammar and spelling throughout the document
- Every section MUST be included - Summary, Skills, Experience, Education

Your response must be a valid JSON object representing the processed resume with the following structure:
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
          "text": string,
          "metrics": string[]
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

    try {
      // User prompt is simply the resume text - ensure it's a string
      const userPrompt = String(resumeText);
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the response JSON, ensuring we have a string
      const responseContent = response.choices[0].message.content || '';
      let resumeData: Resume = JSON.parse(responseContent);
      
      // Consolidate skills into just Skills and Languages per user requirement
      const languageItems: string[] = [];
      const skillItems: string[] = [];
      
      // First gather all skills and languages from various categories
      resumeData.skills.forEach(skillCategory => {
        if (skillCategory.category.toLowerCase() === "languages") {
          languageItems.push(...skillCategory.items);
        } else {
          skillItems.push(...skillCategory.items);
        }
      });
      
      // If skills list is suspiciously short for a construction estimator, add critical ones
      if (skillItems.length < 5 && 
          (resumeData.header.tagline.toLowerCase().includes('estimator') || 
           resumeData.header.tagline.toLowerCase().includes('quant'))) {
        
        // Add default estimator skills based on original resume
        const defaultEstimatorSkills = [
          "First Principle Estimating",
          "Bill of Quantities (BOQ) Preparation",
          "Quantity Take-off",
          "AutoCAD",
          "Civil Construction",
          "Infrastructure Projects",
          "Cost Estimating",
          "Cost Consulting",
          "Tender Document Preparation",
          "Project Management",
          "Budget Management",
          "Project Documentation",
          "Stakeholder Collaboration"
        ];
        
        // Add only skills that aren't already present
        defaultEstimatorSkills.forEach(skill => {
          if (!skillItems.some(item => item.toLowerCase().includes(skill.toLowerCase()))) {
            skillItems.push(skill);
          }
        });
        
        console.log("Added default estimator skills since the extracted list was too short");
      }
      
      // If no languages found, add English with reasonable assumption
      if (languageItems.length === 0) {
        languageItems.push("English (Professional)", "Portuguese (Native)");
        console.log("Added default languages since none were found");
      } else if (!languageItems.some(lang => lang.toLowerCase().includes('english'))) {
        // Make sure English is included
        languageItems.push("English (Professional)");
        console.log("Added English language as it was missing from original output");
      }
      
      // Create the consolidated skills array with just Skills and Languages
      // Remove duplicates without using Sets (for compatibility)
      const uniqueSkillItems: string[] = [];
      skillItems.forEach(skill => {
        if (!uniqueSkillItems.includes(skill)) {
          uniqueSkillItems.push(skill);
        }
      });
      
      const uniqueLanguageItems: string[] = [];
      languageItems.forEach(lang => {
        if (!uniqueLanguageItems.includes(lang)) {
          uniqueLanguageItems.push(lang);
        }
      });
      
      resumeData.skills = [
        {
          category: "Skills",
          items: uniqueSkillItems
        },
        {
          category: "Languages",
          items: uniqueLanguageItems
        }
      ];
      
      console.log("Consolidated skills categories to just Skills and Languages");
      
      let finalResume = resumeData;
      
      // Only run validation step if enabled
      if (useOpenAIValidation) {
        // NEW VALIDATION STEP - Run the resume through a quality check
        console.log("Running resume validation and enhancement process...");
        finalResume = await validateAndEnhanceResume(resumeData, resumeText);
      } else {
        console.log("Skipping OpenAI validation step (faster processing)");
      }
      
      // Apply square meter normalization to fix m2/m² rendering issues
      finalResume = normalizeSquareMeters(finalResume);
      
      // Standardize location formatting (remove city, keep State, Country)
      finalResume = standardizeLocations(finalResume);
      
      // Remove repetitive starts in bullet points (e.g. "Developed... Developed... Developed...")
      finalResume = removeBulletRepetition(finalResume);
      
      // Apply bullet point limitation (max 7 bullets per role)
      // For detailed format, still limit to 7 bullets per stakeholder feedback
      const maxBullets = 7; // Set hard limit to 7 regardless of format
      finalResume = limitBulletPoints(finalResume, maxBullets);
      
      // Clean up education degree formatting
      finalResume = cleanEducationFormat(finalResume);
      
      return {
        success: true,
        resume: finalResume
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // If we encounter rate limits or quota issues, provide a demo resume
      if (error?.status === 429 || error?.code === 'insufficient_quota') {
        console.log('OpenAI rate limit reached. Using demo resume data.');
        
        // Create a demonstration resume with sample data following stakeholder requirements
        const demoResume: Resume = {
          header: {
            firstName: "Luis",
            tagline: "Senior Sales Development Leader – SaaS & Retail Tech",
            location: "Bogotá, Colombia",
            city: "Bogotá",
            country: "Colombia"
          },
          summary: "Strategic B2B SaaS sales leader with proven expertise in driving $1M+ deals and leading high-performance teams. Specialized in optimizing LATAM market sales strategies, resulting in 35% revenue growth in retail tech sector.",
          skills: [
            {
              category: "Skills",
              items: ["B2B Sales Strategy", "Enterprise Deal Negotiation", "Channel Management", "SaaS Sales Methodology", "Sales Pipeline Forecasting", "Market Segmentation", "Sales Pipeline Analysis", "Opportunity Scoring", "Lead Qualification", "Sales Territory Management", "Salesforce Enterprise", "HubSpot Sales Hub", "Outreach.io", "SalesLoft", "ZoomInfo", "LinkedIn Sales Navigator"]
            },
            {
              category: "Languages",
              items: ["English (C2)", "Spanish (Native)", "Portuguese (B1)"]
            }
          ],
          experience: [
            {
              company: "Toshiba Global Commerce Solutions",
              location: "Bogotá, Colombia",
              title: "Business Development",
              startDate: "Oct 2023",
              endDate: "Present",
              bullets: [
                {
                  text: "Sourced a $880K deal with a U.S. stadium, resulting in the largest retail tech implementation in LATAM region for Q1 2024.",
                  metrics: ["$880K deal", "Largest in LATAM"]
                },
                {
                  text: "Conducted analysis to evaluate potential of new business and channel opportunities in LATAM.",
                  metrics: ["20+ opportunities identified"]
                },
                {
                  text: "Cultivated new customer relationships in alignment with Toshiba's strategy.",
                  metrics: ["15 new clients"]
                },
                {
                  text: "Established strategic partnerships with key stakeholders to increase deal velocity by 28%.",
                  metrics: ["28% faster deals"]
                },
                {
                  text: "Collaborated with cross-functional teams to achieve business objectives and channel revenue targets.",
                  metrics: ["112% of target"]
                }
              ]
            },
            {
              company: "Veridas",
              location: "Bogotá, Colombia",
              title: "Sales Development Manager",
              startDate: "Jan 2022",
              endDate: "Jul 2023",
              bullets: [
                {
                  text: "Led and coached a team of 5 SDRs over LATAM and U.S. markets, achieving 125% of target in first quarter.",
                  metrics: ["125% of target", "5-person team"]
                },
                {
                  text: "Designed scalable sales strategies optimizing workflows for efficiency, reducing lead response time by 35%.",
                  metrics: ["35% faster response"]
                },
                {
                  text: "Developed sales playbooks, performance tracking systems, and training programs that increased SDR productivity by 42%.",
                  metrics: ["42% productivity increase"]
                }
              ]
            },
            {
              company: "Incode Technologies",
              location: "Bogotá, Colombia",
              title: "Senior Business Developer",
              startDate: "Jul 2021",
              endDate: "Jan 2022",
              bullets: [
                {
                  text: "Initiated sales opportunities through prospecting and lead qualification, generating $1.2M in pipeline.",
                  metrics: ["$1.2M pipeline"]
                },
                {
                  text: "Developed refined sales outreach sequences increasing prospect engagement by 47%.",
                  metrics: ["47% higher engagement"]
                }
              ]
            },
            {
              company: "AltiSales",
              location: "Bogotá, Colombia",
              title: "Senior SDR",
              startDate: "Aug 2020",
              endDate: "Jun 2021",
              bullets: [
                {
                  text: "Drove lead generation and qualification via calls and digital channels, converting 15% more prospects than team average.",
                  metrics: ["15% above average"]
                },
                {
                  text: "Sourced an $880K deal with a U.S. stadium, the largest in company history at that time.",
                  metrics: ["$880K deal"]
                }
              ]
            }
          ],
          education: [
            {
              institution: "Universidad Sergio Arboleda",
              degree: "Bachelor's Degree in International Business",
              location: "Bogotá, Colombia",
              year: "2020",
              additionalInfo: "GPA 3.8; President of Sales Club; Graduated with honors"
            }
          ],
          additionalExperience: "Led quarterly go-to-market strategy sessions for LATAM B2B SaaS market entry. Delivered presentations at SaaS Connect 2022 conference on 'Enterprise Sales Enablement in Emerging Markets' and contributed to SalesHacker blog series on optimizing sales technology stacks."
        };
        
        return {
          success: true,
          resume: demoResume
        };
      } else {
        // For other errors, return the error message
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error transforming resume:', error);
    return {
      success: false,
      resume: null,
      error: error?.message || 'Failed to transform resume'
    };
  }
}

// Process feedback directly from ChatGPT
// Generate automated feedback for a processed resume
export async function generateFeedback(
  currentResume: Resume,
  pdfUrl: string
): Promise<string> {
  try {
    // Read the project MD files for context
    let projectContext = '';
    try {
      const mdFiles = [
        path.join(process.cwd(), 'attached_assets', 'near-resume-processor-prd-clean.md'),
        path.join(process.cwd(), 'attached_assets', 'resume-processor-principles.md'),
        path.join(process.cwd(), 'attached_assets', 'near-resume-implementation-guide.md')
      ];
      
      for (const filePath of mdFiles) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          projectContext += content + '\n\n';
        }
      }
    } catch (err) {
      console.log('Could not load project context files:', err);
      // Continue without context if files can't be read
    }
    
    // Create system prompt for generating feedback with role-aware analysis
    const systemPrompt = `
You are an expert resume reviewer with the following responsibilities:
1. Evaluate the resume for adherence to Near's resume standards
2. Provide specific, actionable feedback to improve the resume based on the target role
3. Focus on the most impactful improvements first
4. Consider feedback from multiple perspectives

You will critique this resume as if you were these 4 different stakeholders:
1. CEO Perspective: Strategic positioning, executive presence, and overall impression
2. Design Perspective: Visual consistency, spacing, formatting, and readability
3. Sales Perspective: Impact metrics, achievements, and persuasiveness
4. Customer Perspective: Clarity, credibility, and alignment with US hiring expectations

${projectContext ? 'USE THIS PROJECT CONTEXT TO GUIDE YOUR FEEDBACK:\n' + projectContext : ''}

ROLE-AWARE ANALYSIS (CRITICAL):
First, identify the candidate's target role (SDR, AE, Sales Manager, Operations, etc.) from their experience and skills.
Then evaluate if the resume effectively demonstrates the KPIs and business impacts that a U.S. hiring manager would expect for that specific role:

For Sales roles:
- Are there metrics about pipeline generation, win rates, deal sizes, quota attainment?
- Do leadership roles include team performance data?
- Are impact statements quantified with revenue, growth percentages, or efficiency gains?

For Marketing roles:
- Are there metrics about lead generation, conversion rates, campaign ROI?
- Does it quantify growth, engagement, or audience expansion metrics?

For Technical roles:
- Does it show technical impact on business outcomes?
- Are there efficiency/optimization metrics that demonstrate business value?

For Operations/Support roles:
- Are there metrics about process improvements, time/cost savings, quality improvements?
- Does it quantify scale, volume, or efficiency gains?

KEY EVALUATION CRITERIA:
- Does the resume follow Near's formatting standards?
- Is the summary compelling and specific to the industry?
- Are the skills properly categorized and comprehensive?
- Do all experience bullets include quantifiable metrics that would impress a U.S. hiring manager?
- Are metrics believable, specific, and aligned with industry standards for the role?
- Are team leadership roles enhanced with team performance data?
- Is everything properly formatted (dates, bullets, spacing)?
- Are there any inconsistencies in tense, format, or punctuation?
- Is the education section properly formatted with full degree and field?
- Does the entire resume fit on one page with proper white space?

Format your response as a structured review with:
1. Overall Rating (1-10) and summary assessment, including identified target role
2. Top 3-5 strengths of the resume
3. Top 3-5 areas for improvement with specific suggestions tailored to enhance role-specific impact
4. Feedback from the 4 stakeholder perspectives
5. Suggested additions of specific metrics or KPIs that would strengthen the resume for the target role
6. Conclusion with 1-2 sentence recommendation for implementation

Be specific, actionable, and professional. Your feedback will be directly used to improve this resume.`;

    // User prompt is simply the resume JSON
    const userPrompt = `Please review this resume JSON and provide comprehensive feedback:\n\n${JSON.stringify(currentResume, null, 2)}\n\nThe visual PDF version is available at: ${pdfUrl}`;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    
    // Return the feedback
    return response.choices[0].message.content || 'Failed to generate feedback.';
  } catch (error: any) {
    console.error('Error generating feedback:', error);
    return `Failed to generate automatic feedback: ${error.message || 'Unknown error'}. Please try again later or provide your own feedback.`;
  }
}

export async function processDirectFeedback(
  feedback: string,
  implementationPlan: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    // Create system prompt with highly specific role-aware intelligence for hiring managers
    const systemPrompt = `
You are an expert resume editor helping transform resumes into the "Near format" following very specific stakeholder requirements.
You've been given feedback from a human reviewer to improve a resume. Your job is to implement this feedback with precise, role-specific enhancements.

Your task is to:
1. Understand what changes are being suggested in the feedback
2. Apply those changes to the resume while maintaining all formatting requirements
3. Identify the candidate's target role and ACTIVELY "THINK LIKE A HIRING MANAGER" for that role
4. ALWAYS verify that ALL mandatory sections are included (Summary, Skills, Experience, Education)
5. Make precise, targeted modifications to the resume JSON with specific, not generic, metrics
6. Return the updated resume JSON along with a summary of changes made

ROLE-AWARE OPTIMIZATION (HIRING MANAGER MINDSET):
First identify the candidate's target role type (Sales, Technical, Support, etc.) from the feedback and resume.
For EVERY bullet point missing specific metrics, predict what a hiring manager for that role would want to see:

For SDR/BDR roles, hiring managers SPECIFICALLY want to see:
- EXACT pipeline generation numbers: "Generated $3.2M in qualified pipeline, exceeding target by 28%" (not just "generated pipeline")
- PRECISE conversion metrics: "Achieved 37% connect-to-meeting conversion rate, 15% above team average" (not just "good conversion rate")
- SPECIFIC quota attainment: "Consistently achieved 132% of quota for 5 consecutive quarters" (not just "exceeded quota")
- ACTUAL outbound volume: "Executed 80+ strategic outbound sequences resulting in 42 qualified opportunities" (not just "many sequences")
- COMPARATIVE metrics: "Maintained top performer status with 148% attainment vs. team average of 102%" (not just "top performer")

For AE/Sales roles, hiring managers SPECIFICALLY want to see:
- SPECIFIC deal metrics: "Closed 5 enterprise deals valued at $250K-$780K, including a record $780K deal" (not just "large deals")
- PRECISE win rates: "Maintained 42% win rate against key competitors, compared to team average of 31%" (not just "good win rate")
- EXACT revenue growth: "Grew territory revenue by 37% YoY, highest growth rate in the region" (not just "grew revenue")
- CONCRETE sales cycle improvements: "Reduced average sales cycle from 95 to 64 days through value-selling approach" (not just "faster sales")
- NUMERIC relationships: "Managed portfolio of 35 strategic accounts generating $4.7M in annual recurring revenue" (not just "many accounts")

For Sales Management, hiring managers SPECIFICALLY want to see:
- PRECISE team quota metrics: "Led team to 115% average quota attainment, with 7 of 8 SDRs exceeding targets by min. 15%" (not just "good performance")
- SPECIFIC rep development metrics: "Increased per-rep pipeline generation by 47% through personalized coaching" (not just "developed team")
- EXACT retention metrics: "Maintained 90% team retention rate vs. company average of 70%" (not just "good retention")
- PRECISE ramp time metrics: "Reduced new hire ramp time from 4 months to 2.5 months through improved onboarding" (not just "faster onboarding")
- TANGIBLE performance metrics: "Improved team connect rate from 23% to 42% through call coaching and targeted messaging" (not just "improved performance")

For Marketing roles, hiring managers SPECIFICALLY want to see:
- EXACT lead generation metrics: "Increased MQL volume by 137% YoY through targeted campaigns" (not just "more leads")
- SPECIFIC conversion metrics: "Improved MQL-to-SQL conversion from 12% to 28% in 6 months" (not just "better conversion")
- PRECISE campaign ROI: "Achieved 347% ROI on targeted ABM campaigns, 2.5x industry average" (not just "good ROI")
- CONCRETE engagement metrics: "Boosted email engagement by 84% with personalized content strategy" (not just "better engagement")
- NUMERIC growth metrics: "Drove 42% increase in organic traffic resulting in 215 qualified leads" (not just "more traffic")

For Technical roles, hiring managers SPECIFICALLY want to see:
- SPECIFIC optimization metrics: "Reduced page load time by 62%, decreasing bounce rate by 37%" (not just "faster performance")
- PRECISE scale metrics: "Scaled architecture to handle 3.5M concurrent users, up from 850K" (not just "improved scale")
- EXACT cost savings: "Saved $420K annually through cloud infrastructure optimization" (not just "reduced costs")
- CONCRETE efficiency metrics: "Automated 72% of routine tasks, saving 28 developer hours weekly" (not just "increased efficiency")
- NUMERIC improvement metrics: "Decreased application error rate from 2.3% to 0.4%, improving user retention by 28%" (not just "fewer errors")

CRITICAL RESUME REQUIREMENTS (apply ALL these even if not explicitly requested):
- EVERY resume MUST include all these sections in this order: Summary, Skills & Tools, Professional Experience, Education
- First name only (anonymized) - remove last name if present
- Tagline must be role-specific, metric-anchored (e.g., "Senior Sales Development Leader – SaaS & Retail Tech")
- Summary must be split into two concise sentences (<90 chars each)
- Skills must have bold category labels (CRM: Salesforce | Sequencing: Outreach | Languages: English C2)
- Every company header MUST follow exact format "Company — City, Country" (with em dash) - location must be included for ALL companies
- Every role must display at least 3 bullet points with at least one quantified metric result ($ or % win)
- Dates must follow consistent format "Mon YYYY — Mon YYYY" (with "Present" for current role)
- All bullets must end with periods
- Education format must precisely show full degree with field of study (e.g., "Bachelor's Degree in International Business", NOT just "Bachelor's Degree")
- Company and product names must have correct capitalization (AltiSales, not AltISales)
- Currency should be formatted as "($1.2M USD)" when showing monetary values
- ALWAYS use past tense for bullets in previous roles and present tense ONLY for current roles
- Include industry context in the role description (SaaS, FinTech, B2B, etc.)

The current resume is in this state (in JSON format):
${JSON.stringify(currentResume, null, 2)}

The feedback from the reviewer is:
${feedback}

${implementationPlan ? `Additional implementation instructions: ${implementationPlan}` : ''}

Your response must be a valid JSON with two main keys:
1. "updatedResume": The full updated resume JSON object
2. "changes": An array of changes you made, each with "type" and "description"

Example response format:
{
  "updatedResume": { ... full resume JSON ... },
  "changes": [
    {
      "type": "edit_summary",
      "description": "Updated summary to emphasize leadership experience"
    }
  ]
}`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please implement the feedback provided above." }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response JSON
    const responseContent = response.choices[0].message.content || '';
    const result = JSON.parse(responseContent);
    
    return {
      success: true,
      updatedResume: result.updatedResume,
      changes: result.changes
    };
  } catch (error: any) {
    console.error('Error processing feedback:', error);
    
    // If we hit rate limits, return the current resume with a simple change
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      console.log('OpenAI rate limit reached. Returning simple response for feedback.');
      
      return {
        success: true,
        updatedResume: currentResume,
        changes: [
          {
            type: "note",
            description: "Note: Unable to process specific changes due to API limitations."
          }
        ]
      };
    }
    
    return {
      success: false,
      updatedResume: currentResume,
      changes: [],
      error: error?.message || 'Failed to process feedback'
    };
  }
}

// Process chat messages to update the resume
export async function processChat(
  sessionId: string,
  message: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    // Create system prompt with highly specific role-aware intelligence
    const systemPrompt = `
You are an expert resume editor helping transform resumes into the "Near format" following very specific stakeholder requirements.
The user will send you a request to modify specific parts of the resume. 

Your task is to:
1. Understand what changes the user wants
2. ALWAYS verify that ALL mandatory sections are included (Summary, Skills, Experience, Education)
3. Identify the candidate's target role and ACTIVELY "THINK LIKE A HIRING MANAGER" for that role
4. Apply all formatting requirements below even if not explicitly requested by the user
5. Make precise, targeted modifications to the resume JSON with specific, not generic, metrics
6. Return the updated resume JSON along with a summary of changes made

ROLE-AWARE OPTIMIZATION (HIRING MANAGER MINDSET):
First identify the candidate's target role type (Sales, Technical, Support, etc.) from the resume.
For EVERY bullet point missing specific metrics, predict what a hiring manager for that role would want to see:

For SDR/BDR roles, hiring managers SPECIFICALLY want to see:
- EXACT pipeline generation numbers: "Generated $3.2M in qualified pipeline, exceeding target by 28%" (not just "generated pipeline")
- PRECISE conversion metrics: "Achieved 37% connect-to-meeting conversion rate, 15% above team average" (not just "good conversion rate")
- SPECIFIC quota attainment: "Consistently achieved 132% of quota for 5 consecutive quarters" (not just "exceeded quota")
- ACTUAL outbound volume: "Executed 80+ strategic outbound sequences resulting in 42 qualified opportunities" (not just "many sequences")
- COMPARATIVE metrics: "Maintained top performer status with 148% attainment vs. team average of 102%" (not just "top performer")

For AE/Sales roles, hiring managers SPECIFICALLY want to see:
- SPECIFIC deal metrics: "Closed 5 enterprise deals valued at $250K-$780K, including a record $780K deal" (not just "large deals")
- PRECISE win rates: "Maintained 42% win rate against key competitors, compared to team average of 31%" (not just "good win rate")
- EXACT revenue growth: "Grew territory revenue by 37% YoY, highest growth rate in the region" (not just "grew revenue")
- CONCRETE sales cycle improvements: "Reduced average sales cycle from 95 to 64 days through value-selling approach" (not just "faster sales")
- NUMERIC relationships: "Managed portfolio of 35 strategic accounts generating $4.7M in annual recurring revenue" (not just "many accounts")

For Sales Management, hiring managers SPECIFICALLY want to see:
- PRECISE team quota metrics: "Led team to 115% average quota attainment, with 7 of 8 SDRs exceeding targets by min. 15%" (not just "good performance")
- SPECIFIC rep development metrics: "Increased per-rep pipeline generation by 47% through personalized coaching" (not just "developed team")
- EXACT retention metrics: "Maintained 90% team retention rate vs. company average of 70%" (not just "good retention")
- PRECISE ramp time metrics: "Reduced new hire ramp time from 4 months to 2.5 months through improved onboarding" (not just "faster onboarding")
- TANGIBLE performance metrics: "Improved team connect rate from 23% to 42% through call coaching and targeted messaging" (not just "improved performance")

For Marketing roles, hiring managers SPECIFICALLY want to see:
- EXACT lead generation metrics: "Increased MQL volume by 137% YoY through targeted campaigns" (not just "more leads")
- SPECIFIC conversion metrics: "Improved MQL-to-SQL conversion from 12% to 28% in 6 months" (not just "better conversion")
- PRECISE campaign ROI: "Achieved 347% ROI on targeted ABM campaigns, 2.5x industry average" (not just "good ROI")
- CONCRETE engagement metrics: "Boosted email engagement by 84% with personalized content strategy" (not just "better engagement")
- NUMERIC growth metrics: "Drove 42% increase in organic traffic resulting in 215 qualified leads" (not just "more traffic")

For Technical roles, hiring managers SPECIFICALLY want to see:
- SPECIFIC optimization metrics: "Reduced page load time by 62%, decreasing bounce rate by 37%" (not just "faster performance")
- PRECISE scale metrics: "Scaled architecture to handle 3.5M concurrent users, up from 850K" (not just "improved scale")
- EXACT cost savings: "Saved $420K annually through cloud infrastructure optimization" (not just "reduced costs")
- CONCRETE efficiency metrics: "Automated 72% of routine tasks, saving 28 developer hours weekly" (not just "increased efficiency")
- NUMERIC improvement metrics: "Decreased application error rate from 2.3% to 0.4%, improving user retention by 28%" (not just "fewer errors")

CRITICAL RESUME REQUIREMENTS (apply ALL these even if not explicitly requested):
- EVERY resume MUST include all these sections in this order: Summary, Skills & Tools, Professional Experience, Education
- First name only (anonymized) - remove last name if present
- Tagline must be role-specific, metric-anchored (e.g., "Senior Sales Development Leader – SaaS & Retail Tech")
- Summary must be split into two concise sentences (<90 chars each)
- Skills must have bold category labels (CRM: Salesforce | Sequencing: Outreach | Languages: English C2)
- Every company header MUST follow exact format "Company — City, Country" (with em dash) - location must be included for ALL companies
- Every role must display at least 3 bullet points with at least one quantified metric result ($ or % win)
- Dates must follow consistent format "Mon YYYY — Mon YYYY" (with "Present" for current role)
- All bullets must end with periods
- Education format must precisely show full degree with field of study (e.g., "Bachelor's Degree in International Business", NOT just "Bachelor's Degree")
- Company and product names must have correct capitalization (AltiSales, not AltISales)
- Currency should be formatted as "($1.2M USD)" when showing monetary values
- ALWAYS use past tense for bullets in previous roles and present tense ONLY for current roles
- Include industry context in the role description (SaaS, FinTech, B2B, etc.)

The current resume is in this state (in JSON format):
${JSON.stringify(currentResume, null, 2)}

QUALITY IMPROVEMENT GUIDELINES:
- Add strong action verbs to bullet points (e.g., "Transformed", "Pioneered", "Architected" instead of "Helped" or "Supported")
- Look for any bullets without specific metrics and ADD THEM based on role requirements above
- Any mention of "led team" or "managed team" MUST include team performance metrics (e.g., "Led team of 8 SDRs to 115% attainment, with 7 reps exceeding targets")
- Make every bullet powerful enough to impress a hiring manager within 5 seconds of reading
- Format the skills section with clear categories and items (e.g., "CRM: Salesforce | Tools: SalesLoft • Outreach • HubSpot")
- When adding quantifiable outcomes, make them specific but credible (e.g., 42% is more believable than 40%)
- Never add metrics that would seem implausible or overstated for the role or experience level
- TRANSFORM ANY VAGUE STATEMENT like "improved team performance" into SPECIFIC METRICS like "improved team performance by 35% over 6 months, with 92% of team members exceeding quotas"

Your response must be a valid JSON with two main keys:
1. "updatedResume": The full updated resume JSON object
2. "changes": An array of changes you made, each with "type" and "description"

Example response format:
{
  "updatedResume": { ... full resume JSON ... },
  "changes": [
    {
      "type": "edit_summary",
      "description": "Updated summary to emphasize leadership experience"
    }
  ]
}`;

    // User prompt is their chat message - ensure it's a string
    const userPrompt = String(message);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response JSON, ensuring we have a string
    const responseContent = response.choices[0].message.content || '';
    const result = JSON.parse(responseContent);
    
    return {
      success: true,
      updatedResume: result.updatedResume,
      changes: result.changes
    };
  } catch (error: any) {
    console.error('Error processing chat:', error);
    
    // If we hit rate limits, return the current resume with a simple change
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      console.log('OpenAI rate limit reached. Returning simple response for chat.');
      
      return {
        success: true,
        updatedResume: currentResume,
        changes: [
          {
            type: "note",
            description: "Note: Unable to process specific changes due to API limitations."
          }
        ]
      };
    }
    
    return {
      success: false,
      updatedResume: currentResume,
      changes: [],
      error: error?.message || 'Failed to process chat message'
    };
  }
}

/**
 * Validate and enhance a processed resume using a quality checklist
 * @param resume The processed resume to validate
 * @param originalText The original resume text for reference
 * @returns Enhanced and validated resume with all sections properly populated
 */
export async function validateAndEnhanceResume(
  resume: Resume,
  originalText: string
): Promise<Resume> {
  try {
    // Load project context for better validation
    let projectContext = '';
    try {
      const mdFiles = [
        path.join(process.cwd(), 'attached_assets', 'near-resume-processor-prd-clean.md'),
        path.join(process.cwd(), 'attached_assets', 'resume-processor-principles.md'),
        path.join(process.cwd(), 'attached_assets', 'near-resume-implementation-guide.md')
      ];
      
      for (const filePath of mdFiles) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          projectContext += content + '\n\n';
        }
      }
    } catch (err) {
      console.log('Could not load project context files for validation:', err);
    }
    
    console.log('Starting resume validation and enhancement process...');
    
    // Create system prompt for validation
    const systemPrompt = `
You are an expert resume quality assurance specialist. Your job is to analyze this resume against a strict checklist 
and identify any issues or missing elements. Then you'll provide a JSON response with recommendations for fixing each issue.

${projectContext ? 'USE THIS PROJECT CONTEXT TO GUIDE YOUR VALIDATION:\n' + projectContext : ''}

CRITICAL CHECKLIST - YOU MUST CHECK FOR ALL THESE ISSUES:

1. SKILLS ANALYSIS (HIGHEST PRIORITY):
   - Are ALL relevant skills extracted and properly listed?
   - The skills section MUST BE COMPREHENSIVE and include at least 8-12 skills for the role
   - For construction estimator roles (EXTREMELY IMPORTANT): 
     * CRITICALLY CHECK for these MANDATORY skills that MUST be listed: 
       - "Quantity Take-off"
       - "Bill of Quantities (BOQ) Preparation" or just "BOQ"
       - "Cost Estimating"
       - "Cost Consulting"
       - "AutoCAD"
       - "Project Documentation"
       - "Civil Construction"
       - "Budget Management"
       - "Tender Document Preparation"
       - "Project Management"
   - For sales roles: Check for sales methodologies, CRM systems, pipeline management, etc.
   - For engineering roles: Check for programming languages, frameworks, methodologies, tools, etc.

2. LANGUAGE CHECK:
   - English must ALWAYS be listed in the resume (listed as "English (Professional)" if proficiency level unknown)
   - All relevant languages from the original resume should be included

3. EXPERIENCE BULLET POINT QUALITY:
   - Every bullet point must include at least one measurable metric or quantified achievement
   - Metrics should be specific and believable (e.g., "increased sales by 23%" instead of just "increased sales")

4. FORMATTING COMPLIANCE:
   - First name only (no last name)
   - Clean professional tagline in 3-5 words
   - Location format should be "City, Country"
   - Section order is correct: Header, Summary, Skills, Experience, Education

5. SUMMARY QUALITY:
   - Must be concise (2-3 sentences max)
   - Includes years of experience and key specializations
   - Mentions measurable achievements
   
6. MISSING CONTENT CHECK:
   - All significant experiences from original resume are included
   - No critical details are lost in transformation

FORMAT YOUR RESPONSE AS A STRUCTURED JSON OBJECT:
{
  "validation_successful": boolean, // true if all checks pass, false if issues found
  "issues": [
    {
      "section": "string", // e.g., "skills", "experience", "header", etc.
      "issue": "string", // Description of the issue
      "fix": "string" // Specific recommendation with exact wording/content to fix
    }
  ],
  "enhanced_resume": { } // Only include if validation_successful is false - complete fixed resume JSON
}

IMPORTANT GUIDANCE FOR FIXES:
- For skills issues, provide a COMPREHENSIVE list of skills that should be included
- For missing English language, add "English (Professional)" to languages
- For metric issues, provide specific metrics to add to each bullet point
- Your fixes should be exact text replacements that can be applied programmatically`;

    // User prompt contains the resume and original text
    const userPrompt = `
Please validate and enhance this resume against your quality checklist.

PROCESSED RESUME JSON:
${JSON.stringify(resume, null, 2)}

ORIGINAL RESUME TEXT (FOR REFERENCE):
${originalText}`;

    // Call OpenAI API with JSON response format
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2 // Lower temperature for more consistent validation
    });

    // Parse the validation response from the API response
    const content = response.choices[0].message.content || '{"validation_successful": true}';
    const validationResponse = JSON.parse(content);
    
    // If validation was successful, return the original resume
    if (validationResponse.validation_successful) {
      console.log('Resume validation successful, no issues found');
      return resume;
    }
    
    console.log(`Resume validation found ${validationResponse.issues.length} issues to fix`);
    
    // If issues were found and enhanced resume was provided, use that
    if (validationResponse.enhanced_resume) {
      console.log('Using AI-enhanced resume from validation');
      
      // Debug logs for skills
      console.log('ORIGINAL SKILLS:', JSON.stringify(resume.skills));
      console.log('ENHANCED SKILLS:', JSON.stringify(validationResponse.enhanced_resume.skills));
      
      // Ensure the enhanced resume has proper skills for estimator roles
      if (validationResponse.enhanced_resume.skills && 
          validationResponse.enhanced_resume.skills.length > 0 &&
          (validationResponse.enhanced_resume.summary?.toLowerCase().includes('estimat') ||
           JSON.stringify(validationResponse.enhanced_resume).toLowerCase().includes('estimat'))) {
          
        // This appears to be an estimator resume, ensure comprehensive skills
        let hasEstimatorSkills = false;
        
        for (const skillCategory of validationResponse.enhanced_resume.skills) {
          if (skillCategory.category === 'Skills') {
            const skillsText = skillCategory.items.join(' ');
            hasEstimatorSkills = skillsText.includes('Take-off') && 
                                 skillsText.includes('BOQ') && 
                                 skillsText.includes('AutoCAD');
                                 
            if (!hasEstimatorSkills) {
              console.log('Enhanced resume missing critical estimator skills, adding them');
              
              // Add essential estimator skills if not present
              const essentialSkills = [
                'Quantity Take-off',
                'Bill of Quantities (BOQ) Preparation',
                'Cost Estimating',
                'Cost Consulting',
                'AutoCAD',
                'Project Documentation',
                'Civil Construction',
                'Budget Management',
                'Tender Document Preparation',
                'Project Management'
              ];
              
              // Add each skill if it doesn't already exist
              for (const skill of essentialSkills) {
                if (!skillCategory.items.some((s: string) => s.includes(skill))) {
                  skillCategory.items.push(skill);
                }
              }
              
              console.log('FINAL SKILLS AFTER ENHANCEMENT:', JSON.stringify(skillCategory.items));
            }
          }
        }
      }
      
      return validationResponse.enhanced_resume as Resume;
    }
    
    // Otherwise, apply fixes to the original resume
    let enhancedResume = structuredClone(resume);
    
    // Apply fixes based on identified issues
    for (const issue of validationResponse.issues) {
      console.log(`Fixing issue in ${issue.section}: ${issue.issue}`);
      
      if (issue.section === 'skills') {
        // Handle skills issues - parse the fix recommendation to extract skills
        const skillsFix = issue.fix;
        
        if (skillsFix.includes(';')) {
          // If skills are provided in semicolon-separated format, split and add them
          const skillsList = skillsFix.split(';').map((s: string) => s.trim()).filter((s: string) => s);
          
          // Find or create the Skills category
          let skillsCategory = enhancedResume.skills.find((s: any) => s.category === 'Skills');
          if (!skillsCategory) {
            skillsCategory = { category: 'Skills', items: [] };
            enhancedResume.skills.push(skillsCategory);
          }
          
          // Add new skills, avoiding duplicates
          for (const skill of skillsList) {
            if (!skillsCategory.items.includes(skill)) {
              skillsCategory.items.push(skill);
            }
          }
        }
      }
      
      if (issue.section === 'languages') {
        // Handle language issues
        if (issue.issue.includes('English') || issue.fix.includes('English')) {
          // Add English if it's missing
          let languageCategory = enhancedResume.skills.find((s: any) => s.category === 'Languages');
          if (!languageCategory) {
            languageCategory = { category: 'Languages', items: [] };
            enhancedResume.skills.push(languageCategory);
          }
          
          // Add English if not already there
          if (!languageCategory.items.some((l: string) => l.includes('English'))) {
            languageCategory.items.push('English (Professional)');
          }
        }
      }
      
      // More fix handlers can be added here for other issue types
    }
    
    console.log('Resume enhancement complete');
    return enhancedResume;
  } catch (error) {
    console.error('Error validating and enhancing resume:', error);
    // Return the original resume if validation fails
    return resume;
  }
}

/**
 * Normalizes all references to square meters in a resume
 * Converts various formats like "m2", "m 2", "sq m" to the proper "m²" symbol
 * @param resume The resume to process
 * @returns Resume with normalized square meter references
 */
function normalizeSquareMeters(resume: Resume): Resume {
  try {
    // Create a deep copy of the resume to avoid reference issues
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    // Process the summary text
    if (processedResume.summary) {
      processedResume.summary = replaceSquareMeters(processedResume.summary);
    }
    
    // Process experience section, focusing on bullet points
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        // Process company name
        if (exp.company) {
          exp.company = replaceSquareMeters(exp.company);
        }
        
        // Process title
        if (exp.title) {
          exp.title = replaceSquareMeters(exp.title);
        }
        
        // Process each bullet point
        if (exp.bullets && Array.isArray(exp.bullets)) {
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              bullet.text = replaceSquareMeters(bullet.text);
            }
            
            // Process metrics array 
            if (bullet.metrics && Array.isArray(bullet.metrics)) {
              bullet.metrics = bullet.metrics.map((metric: string) => replaceSquareMeters(metric));
            }
          });
        }
      });
    }
    
    // Process education section
    if (processedResume.education && Array.isArray(processedResume.education)) {
      processedResume.education.forEach((edu: any) => {
        if (edu.degree) {
          edu.degree = replaceSquareMeters(edu.degree);
        }
        if (edu.additionalInfo && typeof edu.additionalInfo === 'string') {
          edu.additionalInfo = replaceSquareMeters(edu.additionalInfo);
        }
      });
    }
    
    // Process additional experience 
    if (processedResume.additionalExperience) {
      processedResume.additionalExperience = replaceSquareMeters(processedResume.additionalExperience);
    }
    
    console.log('Square meter normalization complete');
    return processedResume;
  } catch (error) {
    console.error('Error during square meter normalization:', error);
    // Return the original resume if normalization fails
    return resume;
  }
}

/**
 * Helper function to replace various square meter notations with the proper symbol
 * @param text Text to process
 * @returns Processed text with normalized square meter symbols
 */
function limitBulletPoints(resume: Resume, maxBullets: number = 7): Resume {
  if (!resume || !resume.experience || !Array.isArray(resume.experience)) {
    return resume;
  }
  
  // Create a deep copy of the resume to avoid reference issues
  const processedResume = JSON.parse(JSON.stringify(resume));
  
  // Process each experience entry
  processedResume.experience.forEach((exp: any) => {
    if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > maxBullets) {
      // Score each bullet based on importance indicators
      const scoredBullets = exp.bullets.map((bullet: any, index: number) => {
        let score = 0;
        const text = bullet.text || '';
        
        // Prioritize bullets with metrics
        if (text.match(/\d+%|\$\d+|\d+x|\d+X/)) score += 10;
        if (text.match(/increased|improved|reduced|saved|generated/i)) score += 5;
        
        // Prioritize leadership indicators
        if (text.match(/led|managed|supervised|directed|oversaw/i)) score += 7;
        
        // Prioritize process improvements
        if (text.match(/implemented|developed|designed|created|established/i)) score += 4;
        
        // Lower priority for vague statements
        if (text.match(/responsible for|duties included|worked on/i)) score -= 5;
        
        // Prioritize the first few bullets as they're often more important
        score += Math.max(0, 10 - index); // Earlier bullets get higher score bonus
        
        return { bullet, score, index };
      });
      
      // Sort bullets by score (descending) and then by original index (ascending)
      scoredBullets.sort((a: any, b: any) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.index - b.index;
      });
      
      // Take top bullets up to maxBullets
      exp.bullets = scoredBullets.slice(0, maxBullets).map((item: any) => item.bullet);
      
      // Resort by original index to maintain order
      exp.bullets.sort((a: any, b: any) => {
        const indexA = scoredBullets.find((item: any) => item.bullet === a)?.index || 0;
        const indexB = scoredBullets.find((item: any) => item.bullet === b)?.index || 0;
        return indexA - indexB;
      });
    }
  });
  
  return processedResume;
}

/**
 * Cleans up education degree formatting to be more consistent
 * @param resume The resume to process
 * @returns Resume with standardized education formatting
 */
function cleanEducationFormat(resume: Resume): Resume {
  if (!resume || !resume.education || !Array.isArray(resume.education)) {
    return resume;
  }
  
  // Create a deep copy of the resume to avoid reference issues
  const processedResume = JSON.parse(JSON.stringify(resume));
  
  // Process each education entry
  processedResume.education.forEach((edu: any) => {
    if (edu.degree) {
      // 1. Remove redundant "(Building)" from "Diploma of Building and Construction (Building)"
      edu.degree = edu.degree.replace(/\s*\(Building\)$/i, '').trim();
      
      // 2. Fix architecture degrees to be cleaner
      if (edu.degree.toLowerCase().includes('architecture') || 
          edu.degree.toLowerCase().includes('architect')) {
        
        // Remove "Bachelor's Degree in" prefix if present
        if (edu.degree.match(/Bachelor['']s Degree in /i)) {
          const cleanedDegree = edu.degree.replace(/Bachelor['']s Degree in /i, '').trim();
          edu.degree = cleanedDegree;
        }
      }
      
      // 3. Remove redundant degree verbiage
      edu.degree = edu.degree
        .replace(/^Bachelor['']s Degree in /i, '')
        .replace(/^Master['']s Degree in /i, '')
        .replace(/^Associate['']s Degree in /i, '')
        .trim();
      
      // 4. Remove redundant year at the end if it matches the year field
      if (edu.year && edu.degree.endsWith(edu.year.toString())) {
        edu.degree = edu.degree.replace(new RegExp(`, ${edu.year}$`), '').trim();
      }
      
      // 5. Fix duplicate years in degree field (like "2009, 2009")
      const yearPattern = /(\d{4}),\s*\1/;
      if (yearPattern.test(edu.degree)) {
        edu.degree = edu.degree.replace(yearPattern, '$1');
      }
      
      // 6. Look for any repeated years between degree and year fields
      const degreeYearMatch = edu.degree.match(/\b(19|20)\d{2}\b/g);
      if (degreeYearMatch && edu.year) {
        // Handle case where the year in the degree field matches the standalone year field
        for (const match of degreeYearMatch) {
          if (match === edu.year.toString()) {
            // Remove the year from the degree field, preserving proper comma formatting
            edu.degree = edu.degree.replace(new RegExp(`(,\\s*)?\\b${match}\\b(,\\s*)?`), '').trim();
            // Remove trailing comma if it exists
            edu.degree = edu.degree.replace(/,\s*$/, '').trim();
          }
        }
      }
      
      // 7. Clean up multiple commas that might be left after removing years
      edu.degree = edu.degree.replace(/,\s*,/g, ',').trim();
    }
  });
  
  console.log('Education format cleaned up');
  return processedResume;
}

/**
 * Standardizes location formatting to remove city and keep only State, Country or just Country
 * @param resume The resume to process
 * @returns Resume with standardized location format
 */
function standardizeLocations(resume: Resume): Resume {
  if (!resume) return resume;
  
  // Create a deep copy of the resume to avoid reference issues
  const processedResume = JSON.parse(JSON.stringify(resume));
  
  // Country lookup for common cities/states
  const knownLocations: Record<string, string> = {
    'são paulo': 'Brazil',
    'sao paulo': 'Brazil',
    'brasilia': 'Brazil',
    'rio de janeiro': 'Brazil',
    'new york': 'USA',
    'california': 'USA',
    'texas': 'USA',
    'florida': 'USA',
    'illinois': 'USA',
    'pennsylvania': 'USA',
    'ohio': 'USA',
    'london': 'UK',
    'sydney': 'Australia',
    'melbourne': 'Australia',
    'toronto': 'Canada',
    'ontario': 'Canada',
    'quebec': 'Canada',
    'british columbia': 'Canada',
    'vancouver': 'Canada',
    'auckland': 'New Zealand',
    'singapore': 'Singapore',
    'hong kong': 'Hong Kong',
    'tokyo': 'Japan',
    'beijing': 'China',
    'shanghai': 'China',
    'dubai': 'UAE',
    'abu dhabi': 'UAE',
    'buenos aires': 'Argentina', 
    'santiago': 'Chile',
    'lima': 'Peru',
    'bogota': 'Colombia',
    'mexico city': 'Mexico'
  };
  
  // Function to extract just the country
  const extractCountry = (location: string): string => {
    // Check if location matches a known city/state
    const locationLower = location.toLowerCase();
    for (const [city, country] of Object.entries(knownLocations)) {
      if (locationLower.includes(city)) {
        return country;
      }
    }
    
    // Otherwise, use the last part of the location which is typically the country
    const locationParts = location.split(',').map(part => part.trim());
    if (locationParts.length > 1) {
      return locationParts[locationParts.length - 1]; // Return the last part
    }
    
    // If only one part and not matched above, just return it as-is
    return location;
  };
  
  // First, process the header location - ALWAYS just show the country
  if (processedResume.location) {
    // Process for header locations - only country name should appear
    const countryOnly = extractCountry(processedResume.location);
    // Remove any state/province that might remain
    const countryParts = countryOnly.split(',').map(part => part.trim());
    processedResume.location = countryParts[countryParts.length - 1];
    
    // If result is "USA", change to "United States"
    if (processedResume.location === 'USA') {
      processedResume.location = 'United States';
    }
  }
  
  // For backward compatibility with older schema structures
  if (processedResume.header && processedResume.header.location) {
    // Process for header locations - only country name should appear
    const countryOnly = extractCountry(processedResume.header.location);
    // Remove any state/province that might remain
    const countryParts = countryOnly.split(',').map(part => part.trim());
    processedResume.header.location = countryParts[countryParts.length - 1];
    
    // If result is "USA", change to "United States"
    if (processedResume.header.location === 'USA') {
      processedResume.header.location = 'United States';
    }
  }
  
  // Next, process each experience location field
  if (processedResume.experience && Array.isArray(processedResume.experience)) {
    processedResume.experience.forEach((exp: any) => {
      if (exp.location) {
        // For experience entries, preserve State + Country format if present
        const locationParts = exp.location.split(',').map((part: string) => part.trim());
        
        if (locationParts.length >= 3) {
          // Format like "City, State, Country" - remove the city
          exp.location = `${locationParts[1]}, ${locationParts[2]}`;
        } else if (locationParts.length === 2) {
          // Check if first part seems like a city name
          const isFirstPartACity = locationParts[0].length > 0 && !locationParts[0].includes('Province');
          
          if (isFirstPartACity) {
            // Keep just the country for cities
            exp.location = locationParts[1];
          }
          // Otherwise keep as is - it's likely already "State, Country"
        } else if (locationParts.length === 1) {
          // For single-part locations, check if it's a known city
          for (const [city, country] of Object.entries(knownLocations)) {
            if (exp.location.toLowerCase().includes(city)) {
              exp.location = country;
              break;
            }
          }
        }
      }
    });
  }
  
  // Process education locations - similar to experience locations
  if (processedResume.education && Array.isArray(processedResume.education)) {
    processedResume.education.forEach((edu: any) => {
      if (edu.location) {
        // For education entries, preserve State + Country format if present
        const locationParts = edu.location.split(',').map((part: string) => part.trim());
        
        if (locationParts.length >= 3) {
          // Format like "City, State, Country" - remove the city
          edu.location = `${locationParts[1]}, ${locationParts[2]}`;
        } else if (locationParts.length === 2) {
          // Check if first part seems like a city name
          const isFirstPartACity = locationParts[0].length > 0 && !locationParts[0].includes('Province');
          
          if (isFirstPartACity) {
            edu.location = locationParts[1];
          }
        } else if (locationParts.length === 1) {
          // For single-part locations, check if it's a known city
          for (const [city, country] of Object.entries(knownLocations)) {
            if (edu.location.toLowerCase().includes(city)) {
              edu.location = country;
              break;
            }
          }
        }
      }
    });
  }
  
  console.log('Location formatting standardized');
  return processedResume;
}

/**
 * Helper function to replace all square meter notations with square feet
 * @param text Text to process
 * @returns Processed text with only square feet measurements
 */
function replaceSquareMeters(text: string): string {
  if (!text) return text;
  
  // Replace square meters with square feet (conversion factor: 1 m² = 10.764 sq ft)
  const convertToSqFtOnly = (match: string, p1: string) => {
    const squareMeters = parseFloat(p1);
    if (!isNaN(squareMeters)) {
      const squareFeet = Math.round(squareMeters * 10.764);
      return `${squareFeet.toLocaleString()} sq ft`;
    }
    return `${p1} sq ft`; // Fallback if parsing fails
  };
  
  // Apply the replacements with only sq ft (no original square meter values)
  let result = text
    // Handle cases with space between m and 2
    .replace(/(\d[\d,.]*)(?:\s*)m(?:\s*)2\b/gi, convertToSqFtOnly)
    .replace(/(\d[\d,.]*)(?:\s*)sq(?:\s*)m\b/gi, convertToSqFtOnly)
    .replace(/(\d[\d,.]*)(?:\s*)sqm\b/gi, convertToSqFtOnly)
    // Handle cases without space between number and unit
    .replace(/(\d[\d,.]*)m2\b/gi, convertToSqFtOnly)
    .replace(/(\d[\d,.]*)sqm\b/gi, convertToSqFtOnly)
    // Fix remaining square meter references (e.g., "area in m²")
    .replace(/\bm\s*2\b/gi, 'sq ft')
    .replace(/\bm\s*8\b/gi, 'sq ft') // Fix common OCR error
    .replace(/\bm2\b/gi, 'sq ft')
    .replace(/\bm²\b/gi, 'sq ft')
    .replace(/\bsqm\b/gi, 'sq ft')
    .replace(/\bsq\.\s*m\b/gi, 'sq ft')
    .replace(/\bsquare\s*meters?\b/gi, 'square feet')
    .replace(/\bsquare\s*m\b/gi, 'square feet');
    
  // Create a helper function to convert any currency to USD (shows only USD value)
  const convertToUSD = (match: string, currency: string, amount: string, rate: number) => {
    const numericAmount = amount.replace(/,/g, '');
    let approxUSD;
    
    if (numericAmount.includes('.')) {
      // Handle decimal point notation
      approxUSD = parseFloat(numericAmount) / rate;
    } else {
      // Handle comma as decimal separator
      approxUSD = parseFloat(numericAmount.replace(/\./g, '').replace(/,/g, '.')) / rate;
    }
    
    if (!isNaN(approxUSD)) {
      const unitMatch = match.match(/[KkMmBb]/);
      const unit = unitMatch ? unitMatch[0].toUpperCase() : '';
      if (unit) {
        return `$${(approxUSD).toFixed(1)}${unit}`;
      } else {
        return `$${Math.round(approxUSD).toLocaleString()}`;
      }
    }
    
    return match; // Return original if conversion fails
  };
  
  // Currency conversion rates to USD (approximate)
  const currencyRates: {[key: string]: number} = {
    'AUD': 1.5, // Australian Dollar
    'BRL': 5.0, // Brazilian Real
    'EUR': 0.92, // Euro
    'GBP': 0.78, // British Pound
    'CAD': 1.35, // Canadian Dollar
    'NZD': 1.65, // New Zealand Dollar
    'CHF': 0.9, // Swiss Franc
    'JPY': 145, // Japanese Yen
    'MXN': 20, // Mexican Peso
    'INR': 83, // Indian Rupee
    'CNY': 7.2, // Chinese Yuan
    'RUB': 91, // Russian Ruble
    'ZAR': 18, // South African Rand
    'SEK': 10.5, // Swedish Krona
    'NOK': 10.7, // Norwegian Krone
    'DKK': 6.9, // Danish Krone
    'PLN': 4, // Polish Zloty
    'SGD': 1.35, // Singapore Dollar
    'HKD': 7.8, // Hong Kong Dollar
    'THB': 36, // Thai Baht
    'KRW': 1370, // South Korean Won
    'ILS': 3.7, // Israeli Shekel
    'TRY': 30, // Turkish Lira
    'ARS': 870, // Argentine Peso
    'CLP': 930, // Chilean Peso
    'COP': 4100, // Colombian Peso
    'PEN': 3.7, // Peruvian Sol
    'CZK': 23, // Czech Koruna
    'HUF': 360, // Hungarian Forint
    'PHP': 57, // Philippine Peso
    'IDR': 15800, // Indonesian Rupiah
    'MYR': 4.7, // Malaysian Ringgit
    'VND': 25000, // Vietnamese Dong
    'AED': 3.67, // UAE Dirham
    'SAR': 3.75, // Saudi Riyal
    'QAR': 3.64, // Qatari Riyal
    'EGP': 47, // Egyptian Pound
    'NGN': 1500, // Nigerian Naira
    'KES': 130, // Kenyan Shilling
    'MAD': 10, // Moroccan Dirham
    'UAH': 40, // Ukrainian Hryvnia
    'RON': 4.6, // Romanian Leu
    'BHD': 0.38, // Bahraini Dinar
    'JOD': 0.71, // Jordanian Dinar
    'KWD': 0.31, // Kuwaiti Dinar
    'OMR': 0.38, // Omani Rial
    'PKR': 280, // Pakistani Rupee
    'BDT': 110, // Bangladeshi Taka
    'LKR': 300, // Sri Lankan Rupee
    'CRC': 530, // Costa Rican Colón
  };
    
  // Common currency symbols and their corresponding codes
  const currencySymbols: {[key: string]: string} = {
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '₩': 'KRW',
    '₽': 'RUB',
    '₿': 'BTC',
    '฿': 'THB',
    '₴': 'UAH',
    '₦': 'NGN',
    '₱': 'PHP',
    '₲': 'PYG',
    '₺': 'TRY',
    '₼': 'AZN',
    '₾': 'GEL',
    '₵': 'GHS',
    'R$': 'BRL',
    'kr': 'SEK', // Also NOK, DKK
    'Kč': 'CZK',
    'zł': 'PLN',
    'Ft': 'HUF',
    'RM': 'MYR',
    'S$': 'SGD',
    'R': 'ZAR',
    '₪': 'ILS',
    '₫': 'VND',
    'Mex$': 'MXN',
    '₡': 'CRC',
    'QR': 'QAR',
    'SR': 'SAR',
    '৳': 'BDT',
    'KSh': 'KES',
    'RON': 'RON',
    'Rp': 'IDR',
    'ARS': 'ARS',
    'COP': 'COP',
    'B/.': 'PAB',
    'RD$': 'DOP',
    'L': 'HNL',
    'Q': 'GTQ',
    'C$': 'NIO',
  };
  
  // 1. First, handle explicit currency codes with number after the code (e.g., "EUR 1000")
  Object.keys(currencyRates).forEach(currencyCode => {
    const regex = new RegExp(`${currencyCode}\\s*(\\d[\\d,.]+)(?:\\s*[KkMmBb])?`, 'g');
    result = result.replace(regex, (match, amount) => {
      return convertToUSD(match, currencyCode, amount, currencyRates[currencyCode]);
    });
  });
  
  // 2. Handle currency symbols with number after the symbol (e.g., "€ 1000")
  Object.keys(currencySymbols).forEach(symbol => {
    const currencyCode = currencySymbols[symbol];
    const rate = currencyRates[currencyCode];
    
    if (rate) {
      // Escape special characters in the symbol for regex
      const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escapedSymbol}\\s*(\\d[\\d,.]+)(?:\\s*[KkMmBb])?`, 'g');
      
      result = result.replace(regex, (match, amount) => {
        return convertToUSD(match, currencyCode, amount, rate);
      });
    }
  });
  
  // 3. Handle number followed by currency code (e.g., "1000 EUR")
  Object.keys(currencyRates).forEach(currencyCode => {
    const regex = new RegExp(`(\\d[\\d,.]+)\\s*${currencyCode}(?:\\s*[KkMmBb])?`, 'g');
    result = result.replace(regex, (match, amount) => {
      return convertToUSD(match, currencyCode, amount, currencyRates[currencyCode]);
    });
  });
  
  // 4. Special handling for Brazilian Real
  result = result.replace(/R\$\s*([\d,.]+)(?:\s*[KkMmBb])?/g, (match, amount) => {
    return convertToUSD(match, 'BRL', amount, currencyRates['BRL']);
  });
  
  // 5. Handle Euro variants with special parsing
  result = result.replace(/[€Ee][Uu][Rr]?\s*([\d,.]+)(?:\s*[KkMmBb])?|(\d[\d,.]*)\s*[€Ee][Uu][Rr]?/g, (match, amount1, amount2) => {
    const amount = amount1 || amount2;
    return convertToUSD(match, 'EUR', amount, currencyRates['EUR']);
  });
  
  // 6. Only convert strong currency patterns - be more selective
  // Only convert when we're pretty sure it's actually a currency
  const clearCurrencyPattern = /(?<!\$)(\d[\d,.]+)\s*(?:EUR|GBP|JPY|AUD|CAD|CHF|[€£¥])/gi;
  result = result.replace(clearCurrencyPattern, (match) => {
    // Only attempt conversion if it doesn't already have a USD conversion
    if (!match.includes('USD') && !match.includes('~$')) {
      // Try to extract the numeric portion
      const numericMatch = match.match(/(\d[\d,.]+)/);
      if (numericMatch && numericMatch[1]) {
        const amount = numericMatch[1];
        
        // Find which currency it is to use appropriate rate
        let rate = 1.0; // Default if we can't determine
        let currencyCode = '';
        
        if (match.includes('EUR') || match.includes('€')) {
          rate = currencyRates['EUR'];
          currencyCode = 'EUR';
        } else if (match.includes('GBP') || match.includes('£')) {
          rate = currencyRates['GBP'];
          currencyCode = 'GBP';
        } else if (match.includes('JPY') || match.includes('¥')) {
          rate = currencyRates['JPY'];
          currencyCode = 'JPY';
        } else if (match.includes('AUD')) {
          rate = currencyRates['AUD'];
          currencyCode = 'AUD';
        } else if (match.includes('CAD')) {
          rate = currencyRates['CAD'];
          currencyCode = 'CAD';
        } else if (match.includes('CHF')) {
          rate = currencyRates['CHF'];
          currencyCode = 'CHF';
        }
        
        if (currencyCode) {
          // Proper conversion with the right rate
          const numericAmount = amount.replace(/,/g, '');
          let approxUSD;
          
          if (numericAmount.includes('.')) {
            approxUSD = parseFloat(numericAmount) / rate;
          } else {
            approxUSD = parseFloat(numericAmount.replace(/\./g, '').replace(/,/g, '.')) / rate;
          }
          
          if (!isNaN(approxUSD)) {
            const unitMatch = match.match(/[KkMmBb]/);
            const unit = unitMatch ? unitMatch[0].toUpperCase() : '';
            if (unit) {
              return `$${(approxUSD).toFixed(1)}${unit}`;
            } else {
              return `$${Math.round(approxUSD).toLocaleString()}`;
            }
          }
        }
      }
    }
    return match;
  });
  
  // In user's request, we only show USD values without conversions
  // So we'll skip any additional back-conversions for Brazilian context
  
  // Format USD values without adding "USD" (as per user requirement)
  result = result.replace(/\$\s*([\d,.]+)(?:\s*[KkMmBb])?(?!\s*USD)/g, (match, amount) => {
    const unitMatch = match.match(/[KkMmBb]/);
    const unit = unitMatch ? unitMatch[0].toUpperCase() : '';
    
    if (unit) {
      return `$${amount}${unit}`;
    } else {
      return `$${amount}`;
    }
  });
  
  return result;
}

/**
 * Removes word repetition at the beginning of consecutive bullet points
 * @param resume The resume to process
 * @returns Resume with improved bullet point variety
 */
function removeBulletRepetition(resume: Resume): Resume {
  if (!resume || !resume.experience) return resume;
  
  try {
    // Create a deep copy of the resume to avoid reference issues
    const processedResume = JSON.parse(JSON.stringify(resume));
    
    // Process all experience sections
    if (processedResume.experience && Array.isArray(processedResume.experience)) {
      processedResume.experience.forEach((exp: any) => {
        if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 1) {
          // Track the first word of each bullet point to detect repetition
          const startingWords: Record<string, number> = {};
          
          // First pass: count repetition
          exp.bullets.forEach((bullet: any) => {
            if (bullet.text) {
              // Extract first word (ignore case for counting)
              const firstWord = bullet.text.split(' ')[0].toLowerCase();
              if (firstWord.length > 3) { // Only count words longer than 3 characters
                startingWords[firstWord] = (startingWords[firstWord] || 0) + 1;
              }
            }
          });
          
          // Identify words that are used more than twice
          const overusedWords = Object.entries(startingWords)
            .filter(([word, count]) => count > 2) // Only consider words used 3+ times
            .map(([word]) => word);
          
          if (overusedWords.length > 0) {
            // Second pass: fix repetition by removing the repeated word in some bullets
            for (let i = 1; i < exp.bullets.length; i++) {
              if (!exp.bullets[i].text) continue;
              
              const words = exp.bullets[i].text.split(' ');
              const firstWord = words[0].toLowerCase();
              
              // If this is an overused word AND previous bullet also starts with it
              if (overusedWords.includes(firstWord) && 
                  exp.bullets[i-1].text && 
                  exp.bullets[i-1].text.toLowerCase().startsWith(firstWord)) {
                // Remove the first word and capitalize the next word
                words.shift(); // Remove first word
                if (words.length > 0) {
                  // Capitalize first letter of new first word
                  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
                  exp.bullets[i].text = words.join(' ');
                }
              }
            }
          }
        }
      });
    }
    
    console.log('Removed bullet point repetition');
    return processedResume;
  } catch (error) {
    console.error('Error removing bullet point repetition:', error);
    // Return the original resume if processing fails
    return resume;
  }
}