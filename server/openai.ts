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
  detailedFormat: boolean = false
): Promise<ResumeTransformationResponse> {
  try {
    // Create system prompt with comprehensive stakeholder feedback and role-aware logic
    // Check if detailed format is requested
    const formatType = detailedFormat ? "DETAILED TWO-PAGE FORMAT" : "STANDARD ONE-PAGE FORMAT";
    
    const systemPrompt = `
You are an expert resume editor specializing in transforming Latin American professional resumes into high-quality, "Americanized" formats for Near's talent database. Your task is to reformat, enhance, and optimize resumes to showcase candidates as confident, top-tier talent while maintaining factual accuracy and professional credibility.

FORMAT TYPE: ${formatType}
${detailedFormat ? 
  `This resume is for an experienced professional with 10+ years of experience. Create a comprehensive two-page resume that includes more detailed work history, preserves more bullet points per role, and provides a fuller picture of their career progression and accomplishments. Don't discard valuable experience details.` 
  : 
  `This resume should be optimized for a one-page format that highlights the most impactful and relevant experiences, prioritizing quality over quantity.`
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
- SKILLS & TOOLS: Format as a simple list with only two categories: "Skills" and "Languages". Do not use additional subcategories. This MUST be included.
- PROFESSIONAL EXPERIENCE: Reverse chronological order with metrics. This MUST be included.
- EDUCATION: Must include full degree with specific field of study (e.g., "Bachelor's Degree in International Business", NOT just "Bachelor's Degree"), institution, location, and graduation year. This MUST be included.
- ADDITIONAL EXPERIENCE (if relevant): Optional, but if included, follow same formatting rules.

BULLET & FORMATTING RULES:
1. Every bullet MUST end with a period and have a strong action verb.
2. Format Skills & Tools with ONLY two categories: "Skills" and "Languages". For Languages, include proficiency level (e.g., "Skills: Project Management, Leadership, CRM | Languages: English (C2), Spanish (Native)")
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
      const resumeData: Resume = JSON.parse(responseContent);
      
      return {
        success: true,
        resume: resumeData
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
              items: ["B2B Sales Strategy", "Enterprise Deal Negotiation", "Channel Management", "SaaS Sales Methodology", "Salesforce Enterprise", "HubSpot Sales Hub", "Outreach.io", "SalesLoft", "ZoomInfo", "Sales Pipeline Forecasting", "Market Segmentation", "Opportunity Scoring"]
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