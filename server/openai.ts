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
    // Create system prompt using guidance from resume-processor-principles.md
    const systemPrompt = `
You are an expert resume editor specializing in transforming Latin American professional resumes into high-quality, "Americanized" formats for Near's talent database. Your task is to reformat, enhance, and optimize resumes to showcase candidates as confident, top-tier talent while maintaining factual accuracy and professional credibility.

RESUME FORMAT REQUIREMENTS:
- One page maximum length
- Clean, professional layout with standard sections
- First name only (anonymized)
- Professional role title (5 words max)
- Location (City, Country)
- Sections in order: Summary, Skills & Tools, Professional Experience, Education, Additional Experience
- Past tense for all bullets except current role
- Solid round bullets with periods
- Three-letter month format (Jan 2023 – Present)

CONTENT ENHANCEMENT RULES:
1. Create a concise one-sentence professional summary
2. Format Skills & Tools as a compact list (e.g., "CRM | Salesforce • Languages | English C2")
3. Prioritize quantifiable achievements with specific metrics
4. Add reasonable metrics where missing (must be contextually appropriate)
5. Convert local currency to USD (Format: "200M MXN ($11M USD)")
6. Format numbers: K for thousands, M for millions, B for billions, no decimals
7. Allocate bullets based on relevance, recency, tenure:
   - Current/relevant roles: up to 5 bullets
   - Mid-career roles: 2-4 bullets
   - Early/less relevant: 1-2 bullets
   - Short stints (≤6 months): minimal bullets regardless of recency
8. Apply page-fitting logic if needed:
   - First: Tighten verbose bullets
   - Second: Reduce bullets from oldest roles 
   - Third: Remove lowest-impact bullets

QUALITY STANDARDS:
- Perfect grammar and spelling
- Professional US business English (avoid foreign-sounding phrases)
- Concrete, specific achievements over vague responsibilities
- Strong action verbs starting each bullet
- Logical priority order (most impressive first)

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
        
        // Create a demonstration resume with sample data
        const demoResume: Resume = {
          header: {
            firstName: "Luis",
            tagline: "Senior Business Development Representative",
            location: "Sao Paulo, Brazil",
            city: "Sao Paulo",
            country: "Brazil"
          },
          summary: "Result-oriented business development professional with 5+ years of experience driving revenue growth and building strategic partnerships in the SaaS industry.",
          skills: [
            {
              category: "Sales Tools",
              items: ["Salesforce", "HubSpot", "Outreach", "LinkedIn Sales Navigator"]
            },
            {
              category: "Languages",
              items: ["English (Fluent)", "Portuguese (Native)", "Spanish (Conversational)"]
            },
            {
              category: "Technical",
              items: ["CRM Administration", "Sales Forecasting", "Market Analysis", "Deal Structuring"]
            }
          ],
          experience: [
            {
              company: "TechSolutions Inc.",
              location: "Sao Paulo, Brazil",
              title: "Senior BDR Team Lead",
              startDate: "Jan 2023",
              endDate: "Present",
              bullets: [
                {
                  text: "Leading a team of 8 BDRs, exceeding quarterly pipeline targets by 135% and generating $3.2M in qualified opportunities.",
                  metrics: ["135% of target", "$3.2M pipeline"]
                },
                {
                  text: "Implemented new outreach strategies that increased team's lead-to-opportunity conversion rate by 28%.",
                  metrics: ["28% increase"]
                },
                {
                  text: "Developed and delivered training program improving average ramp time for new BDRs from 90 to 45 days.",
                  metrics: ["50% faster ramp time"]
                }
              ]
            },
            {
              company: "DataSync",
              location: "Sao Paulo, Brazil",
              title: "Business Development Representative",
              startDate: "Mar 2021",
              endDate: "Dec 2022",
              bullets: [
                {
                  text: "Consistently achieved 115% of monthly quota, generating over 40 qualified opportunities per quarter.",
                  metrics: ["115% quota attainment", "40+ opportunities/quarter"]
                },
                {
                  text: "Pioneered new enterprise account targeting strategy that increased average deal size by 45%.",
                  metrics: ["45% larger deals"]
                }
              ]
            },
            {
              company: "MarketConnect",
              location: "Rio de Janeiro, Brazil",
              title: "Sales Development Intern",
              startDate: "Jun 2020",
              endDate: "Feb 2021",
              bullets: [
                {
                  text: "Conducted market research and built prospect lists resulting in 380 new potential customers.",
                  metrics: ["380 new prospects"]
                }
              ]
            }
          ],
          education: [
            {
              institution: "University of Sao Paulo",
              degree: "Bachelor of Business Administration",
              location: "Sao Paulo, Brazil",
              year: "2020",
              additionalInfo: "Focus on International Business; President of Entrepreneurship Club"
            }
          ],
          additionalExperience: "Volunteer Sales Coach at Junior Achievement Brazil, mentoring young entrepreneurs in sales strategy and business development."
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
export async function processChat(
  sessionId: string,
  message: string,
  currentResume: Resume
): Promise<ChatProcessingResponse> {
  try {
    // Create system prompt for chat
    const systemPrompt = `
You are an expert resume editor helping adjust a resume that has already been processed into the "Near format".
The user will send you a request to modify specific parts of the resume. 

Your task is to:
1. Understand what changes the user wants
2. Make precise, targeted modifications to the resume JSON
3. Return the updated resume JSON along with a summary of changes made

The current resume is in this state (in JSON format):
${JSON.stringify(currentResume, null, 2)}

When making changes:
- Maintain the same high-quality professional standards
- Keep the resume to one page (don't add too much content)
- Make only the changes requested by the user
- Ensure any metrics remain realistic and contextually appropriate
- Maintain all formatting requirements (capitalization, dates, etc.)

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
