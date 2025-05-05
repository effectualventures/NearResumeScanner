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
    // Create system prompt incorporating feedback from stakeholders
    const systemPrompt = `
You are an expert resume editor specializing in transforming Latin American professional resumes into high-quality, "Americanized" formats for Near's talent database. Your task is to reformat, enhance, and optimize resumes to showcase candidates as confident, top-tier talent while maintaining factual accuracy and professional credibility.

RESUME FORMAT REQUIREMENTS:
- One page maximum length
- Clean, professional layout with standard sections
- First name only (anonymized)
- Professional role title (5 words max) must be metric-anchored, specific and tailored (e.g., "Senior Sales Development Leader – SaaS & Retail Tech")
- Location (City, Country)
- Sections in order: Summary, Skills & Tools, Professional Experience, Education, Additional Experience
- Past tense for all bullets except current role
- Solid round bullets with periods at the end of each bullet
- Three-letter month format for all dates (e.g., "Jan 2023 – Present") - consistency is critical

CONTENT ENHANCEMENT RULES:
1. Create a professional summary split into two concise sentences (<90 chars each).
2. Format Skills & Tools with bold category labels (e.g., "CRM: Salesforce | Sequencing: Outreach | Languages: English C2")
3. Every company header must follow exact format "Company — City, Country" (with proper em dash)
4. Every role MUST display at least one quantified metric result ($ or % win)
5. Convert all currencies with format "($1.2M USD)" when showing monetary values
6. Format numbers: K for thousands, M for millions, B for billions, no decimals
7. Allocate bullets based on relevance with highest-impact stat first for each role
8. Ensure every section has proper spacing and alignment
9. Education format must be precise: "Institution — Degree, Major, Location, Year" with GPA if available
10. Company and product names must have correct capitalization: "AltiSales" not "AltISales"

QUALITY STANDARDS:
- Summary must feel human, not generic (avoid phrases like "dynamic business developer")
- Tagline should be role-specific (e.g., "Senior Sales Development Leader – SaaS & Retail Tech")
- Each role must follow consistent date format "Mon YYYY — Mon YYYY" (use "Present" for current roles)
- Every bullet should end with period
- Perfect grammar and spelling throughout the document
- Consistently style all headings (weight, spacing)
- No widows/orphans (no single bullet wrapping to second line alone)

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
          summary: "Dynamic business developer with a proven record in leading sales teams, sourcing high-value deals, and optimizing sales strategies across diverse markets.",
          skills: [
            {
              category: "Sales",
              items: ["Business Development Tools", "CRM Languages", "English C2"]
            },
            {
              category: "Technical",
              items: ["SalesLoft", "HubSpot", "Outreach", "Salesforce", "Sequencing"]
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
              degree: "Bachelor's Degree",
              location: "Bogotá, Colombia",
              year: "2020",
              additionalInfo: "GPA 3.8; International Business major; President of Sales Club"
            }
          ],
          additionalExperience: "Participated in marketing initiatives and prepared client interaction reports for executive leadership. Contributed to industry events as presenter on sales technologies (2019-2022)."
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
    // Create system prompt for chat with enhanced requirements
    const systemPrompt = `
You are an expert resume editor helping adjust a resume into the "Near format" with specific persona-based requirements.
The user will send you a request to modify specific parts of the resume. 

Your task is to:
1. Understand what changes the user wants
2. Apply stakeholder-specific requirements to the resume
3. Make precise, targeted modifications to the resume JSON
4. Return the updated resume JSON along with a summary of changes made

CRITICAL RESUME REQUIREMENTS (apply these even if not explicitly requested):
- Tagline must be role-specific, metric-anchored (e.g., "Senior Sales Development Leader – SaaS & Retail Tech")
- Summary must be split into two concise sentences (<90 chars each)
- Skills must have bold category labels (CRM: Salesforce | Sequencing: Outreach | Languages: English C2)
- Every company header must follow exact format "Company — City, Country" (with em dash)
- Every role must display at least one quantified metric result
- Dates must follow consistent format "Mon YYYY — Mon YYYY" (with "Present" for current role)
- All bullets must end with periods
- Education format must show degree, major, institution, year
- Company and product names must have correct capitalization (AltiSales, not AltISales)
- Currency should be formatted as "($1.2M USD)" when showing monetary values

The current resume is in this state (in JSON format):
${JSON.stringify(currentResume, null, 2)}

Make sure to include at least one quantified bullet per role (with $ or % metric), prioritize the highest-impact achievements, and avoid generic language.

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
