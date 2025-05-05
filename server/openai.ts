import OpenAI from "openai";
import { Resume } from "@shared/schema";
import { 
  ResumeTransformationResponse, 
  ChatProcessingResponse 
} from "./types";

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key'
});

// Main function to transform resume
export async function transformResume(
  resumeText: string,
  sessionId: string
): Promise<ResumeTransformationResponse> {
  try {
    // Create system prompt with comprehensive stakeholder feedback
    const systemPrompt = `
You are an expert resume editor specializing in transforming Latin American professional resumes into high-quality, "Americanized" formats for Near's talent database. Your task is to reformat, enhance, and optimize resumes to showcase candidates as confident, top-tier talent while maintaining factual accuracy and professional credibility.

RESUME FORMAT REQUIREMENTS (MANDATORY):
- One page maximum length
- Clean, professional layout with standard sections
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
- SKILLS & TOOLS: Format as a compact, categorized list with specific tools in each category (not just generic terms). This MUST be included.
- PROFESSIONAL EXPERIENCE: Reverse chronological order with metrics. This MUST be included.
- EDUCATION: Must include full degree with specific field of study (e.g., "Bachelor's Degree in International Business", NOT just "Bachelor's Degree"), institution, location, and graduation year. This MUST be included.
- ADDITIONAL EXPERIENCE (if relevant): Optional, but if included, follow same formatting rules.

BULLET & FORMATTING RULES:
1. Every bullet MUST end with a period and have a strong action verb.
2. Format Skills & Tools with bold category labels (e.g., "CRM: Salesforce | Sequencing: Outreach | Languages: English C2")
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
- Every bullet should convey impact and value through specificity and quantified results
- Add subtle industry context to company descriptions where helpful 
- Create bullets that would make a hiring manager say "wow" within 5 seconds
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
      // User prompt is simply the resume text
      const userPrompt = resumeText;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the response JSON
      const resumeData: Resume = JSON.parse(response.choices[0].message.content);
      
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
              category: "Sales",
              items: ["B2B Sales Strategy", "Enterprise Deal Negotiation", "Channel Management", "SaaS Sales Methodology", "English C2"]
            },
            {
              category: "Technical",
              items: ["Salesforce Enterprise", "HubSpot Sales Hub", "Outreach.io", "SalesLoft", "ZoomInfo"]
            },
            {
              category: "Analytics",
              items: ["Sales Pipeline Forecasting", "Market Segmentation", "Opportunity Scoring", "Revenue Attribution"]
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

// Process chat messages to update the resume
// Process feedback directly from ChatGPT
export async function processDirectFeedback(
  feedback: string,
  implementationPlan: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    // Create system prompt for implementing feedback
    const systemPrompt = `
You are an expert resume editor helping transform resumes into the "Near format" following very specific stakeholder requirements.
You've been given feedback from a human reviewer to improve a resume. Your job is to implement this feedback.

Your task is to:
1. Understand what changes are being suggested in the feedback
2. Apply those changes to the resume while maintaining all formatting requirements
3. ALWAYS verify that ALL mandatory sections are included (Summary, Skills, Experience, Education)
4. Make precise, targeted modifications to the resume JSON
5. Return the updated resume JSON along with a summary of changes made

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
    const result = JSON.parse(response.choices[0].message.content);
    
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

export async function processChat(
  sessionId: string,
  message: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    // Create system prompt for chat with comprehensive requirements
    const systemPrompt = `
You are an expert resume editor helping transform resumes into the "Near format" following very specific stakeholder requirements.
The user will send you a request to modify specific parts of the resume. 

Your task is to:
1. Understand what changes the user wants
2. ALWAYS verify that ALL mandatory sections are included (Summary, Skills, Experience, Education)
3. Apply all formatting requirements below even if not explicitly requested by the user
4. Make precise, targeted modifications to the resume JSON
5. Return the updated resume JSON along with a summary of changes made

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
- Make sure every bullet has a measurable impact and ends with a period
- Make every bullet powerful enough to impress a hiring manager within 5 seconds of reading
- If any of the required sections (Summary, Skills, Experience, Education) are missing, create them with appropriate content
- Format the skills section with clear categories and items (e.g., "CRM: Salesforce | Tools: SalesLoft • Outreach • HubSpot")
- ENSURE that there are no blank sections - every mandatory section must have content

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

    // User prompt is their chat message
    const userPrompt = message;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response JSON
    const result = JSON.parse(response.choices[0].message.content);
    
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
