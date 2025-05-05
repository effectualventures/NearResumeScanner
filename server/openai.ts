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
  } catch (error) {
    console.error('Error transforming resume:', error);
    return {
      success: false,
      resume: null,
      error: error.message || 'Failed to transform resume'
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
  } catch (error) {
    console.error('Error processing chat:', error);
    return {
      success: false,
      updatedResume: currentResume,
      changes: [],
      error: error.message || 'Failed to process chat message'
    };
  }
}
