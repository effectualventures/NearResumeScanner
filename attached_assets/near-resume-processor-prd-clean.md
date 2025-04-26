# Near Resume Processor - Product Requirements Document

## Overview
The Near Resume Processor is a web application that standardizes, improves, and "Americanizes" resumes from Latin American talent. This document details the requirements for a streamlined web app that allows users to upload resumes, transforms them into a standardized format with enhanced content, provides a chat interface for post-generation adjustments, and enables downloading for Airtable integration.

## The Problem
Near has an immediate need to create a database of high-quality, standardized resumes from Latin American talent that can be shared with prospects and clients. The current process is manual, inconsistent, and doesn't properly showcase the quality of candidates. A well-maintained resume database would:

1. Power serious outbound sales efforts
2. Help generate leads through the website
3. Provide immediate examples during prospect calls
4. Establish Near as a source of top-tier international talent

## Core Principles

### 1. Resumes as a Marketing Asset
The resume database is primarily a sales and marketing tool. Each resume must present candidates as confident, top 1% talent while remaining believable and professional. We're creating resumes that are indistinguishable from high-quality US resumes.

### 2. Quality Over Quantity
Every resume in the database must be exceptional. The system will improve even decent resumes to make them fully presentable to companies, with quantifiable achievements, concise writing, and professional formatting.

### 3. Simplicity in Implementation
The application should focus on core functionality without unnecessary complexity. No webhooks, automations, Zapier integrations, or Slack APIs are needed for the initial version.

## User Experience Flow

1. **Upload**: User uploads a PDF or Word document resume
2. **Processing**: System converts the resume to the standardized format with enhanced content
3. **Review/Chat**: User can chat with the system to make specific adjustments
4. **Download**: User downloads the finalized PDF for adding to Airtable

## Detailed Requirements

### 1. Resume Upload Interface
- Simple drag-and-drop or file selection interface
- Support for PDF and Word document formats (.pdf, .doc, .docx)
- Maximum file size: 10MB
- Error handling for unsupported file types, oversized files, or corrupt files
- Progress indicator for uploads with percentage completion
- OCR fallback for scanned image PDFs (with confidence scoring)

### 2. Resume Processing Engine

#### 2.1 Format Standardization
The system will reformat all resumes to follow a consistent, high-quality template:

**Header**:
- First name only (anonymized)
- Professional title/role (5 words or fewer)
- Location (City, Country)
- Horizontal divider line

**Structure**:
- One-page maximum length
- Professional sections in this order:
  1. Summary (1-2 sentences)
  2. Skills & Tools (single line or compact block)
  3. Professional Experience (reverse chronological)
  4. Education
  5. Additional Experience (if space permits)

**Formatting**:
- Clean, minimal design
- Section headers in UPPERCASE
- Company — Location with right-aligned dates
- Solid bullet points (•) with periods at end
- 3-letter month abbreviations in dates
- Past tense for all bullets except current role
- Near logo in bottom-right footer, positioned 0.4" from bottom edge, 60px height

#### 2.2 Content Enhancement
The system will enhance resume content with these rules:

**Summary**:
- Create a concise, one-sentence professional summary
- Highlight key expertise, years of experience, and standout achievements

**Skills & Tools**:
- Place directly after summary
- Format as a compact list
- Prioritize technical skills, tools, and language proficiency

**Professional Experience**:
- Prioritize quantifiable achievements with specific metrics
- Convert vague statements to concrete accomplishments
- Add reasonable quantifiable metrics when missing (must be believable)
- Convert local currency to USD equivalent
- Format: K for thousands, M for millions, B for billions, no decimals

**Bullet Point Allocation**:
- Allocate space proportional to role relevance, tenure, and impact
- More bullets for recent, relevant, or longer-tenure positions
- Fewer bullets for older or shorter-stint (≤6 months) roles
- Compress multi-line bullets to single lines when possible

**Page-Fitting Logic**:
1. Compress verbose bullets (prioritizing oldest/less relevant)
2. Reduce bullets from older roles
3. If still too long, remove lower-impact bullets

**Education**:
- Include degree, major, university, year, and honors if available
- Remove education details first if space is needed

#### 2.3 Resume Analysis
The system should analyze the original resume to extract:
- Role titles and companies
- Skills and technologies
- Quantifiable achievements
- Education details
- Length of tenure at each position

### 3. Chat Interface for Adjustments

After processing, provide a simple chat interface where users can:
- Request specific changes to bullets or sections
- Ask to emphasize certain skills or achievements
- Get suggestions for further improvements
- Fine-tune the professional summary
- Address any formatting issues

The chat should understand resume-specific terminology and be able to make targeted adjustments without requiring the user to reprocess the entire document. It should maintain session state to track the current state of the resume during the editing process.

Example commands the chat should handle:
- "Make the summary more focused on leadership experience"
- "Add more emphasis on the Salesforce implementation project"
- "Reword the second bullet under Company X to highlight results better"
- "Move the education section above additional experience"
- "Change '120%' to '120 %' with proper spacing"

### 4. Download Options

- Download as PDF (primary option)
- File naming: Role (Country) – C-XXXX.pdf
- Clear indication that download is complete
- Option to process another resume after download

## Technical Implementation

### Client-Side Components

1. **Upload Component**
   - File picker with drag-and-drop support
   - Progress indicator during upload
   - File type validation

2. **Resume Preview**
   - Side-by-side display of original and processed resume
   - Ability to zoom or expand view

3. **Chat Interface**
   - Input field for adjustment requests
   - Message history display
   - Typing indicator

4. **Download Component**
   - Download button
   - File name preview
   - Success confirmation

### Server-Side Components

1. **File Handler**
   - Parse PDF and Word documents
   - Extract text and structure
   - Temporary file storage

2. **Resume Processor**
   - Natural language processing to identify sections
   - Content enhancer for bullets and summaries
   - Formatter for standardization

3. **PDF Generator**
   - HTML template system
   - PDF rendering engine
   - Near logo integration

4. **Chat Backend**
   - Resume-specific NLP model
   - Context management to track the resume being discussed
   - Ability to make targeted changes to specific sections

## Replit Implementation

For Replit implementation, a simple Node.js application with the following structure is recommended:

```
/resume-processor
  /public
    /css
    /js
    /images
  /views
  /server
    /utils
    /models
    /controllers
  package.json
  .env
  README.md
```

### Key Libraries to Consider

- Express.js for the web server
- Multer for file uploads
- pdf-parse for PDF extraction
- docx for Word document parsing
- A language model API for content enhancement
- html-pdf or puppeteer for PDF generation
- Socket.io for real-time chat functionality

## Development Phases

### Phase 1: Core Upload and Processing (1-2 weeks)
- Implement file upload functionality
- Develop basic resume parsing
- Create simple enhancement logic
- Generate standardized PDFs
- Basic error handling

### Phase 2: Chat Interface (1 week)
- Implement chat UI
- Connect to language model API
- Develop context management for resume editing
- Test adjustment capabilities

### Phase 3: Download and Refinement (1 week)
- Implement download functionality
- Add file naming logic
- Improve processing accuracy
- Add progress indicators
- Enhance error handling

### Phase 4: Testing and Polishing (1 week)
- Test with various resume formats and styles
- Refine enhancement algorithms
- Optimize performance
- Improve UI/UX
- Documentation

## Metrics for Success

1. **Processing Accuracy**: Percentage of resumes correctly parsed and structured
2. **Enhancement Quality**: Rating of how well the content is improved (manual review)
3. **Format Consistency**: Adherence to the template standards
4. **Processing Time**: Time from upload to processed resume display (target: ≤25s for 95th percentile)
5. **Chat Effectiveness**: Percentage of adjustment requests correctly implemented (target: ≤5s response time)
6. **User Satisfaction**: Feedback from operators using the system
7. **Privacy Compliance**: Successful adherence to 24-hour file retention policy

## Testing and Quality Assurance

1. **Unit Testing**: Test individual components (currency conversion, page-fitting logic)
2. **Integration Testing**: Test API endpoints and services
3. **Accessibility Testing**: Verify WCAG 2.1 AA compliance
4. **Security Testing**: Validate PII handling and file management
5. **User Acceptance Testing**: End-to-end testing with various resume formats and scenarios

## Future Enhancements (Post-MVP)

1. **Batch Processing**: Allow multiple resume uploads and processing
2. **Template Variations**: Different designs for different roles or industries
3. **Integration with Airtable**: Direct API connection to populate Airtable records
4. **Custom Field Mapping**: User-defined mapping between resume sections and Airtable fields
5. **Quality Scoring**: Automated scoring of resume quality with suggestions
6. **Version History**: Track changes made to resumes over time

## Conclusion

The Near Resume Processor will transform how Near manages and leverages its talent database. By creating a streamlined process for standardizing and enhancing resumes, Near can build a high-quality collection of "Americanized" resumes that will power sales efforts and enhance the company's reputation as a source of top international talent.

This PRD provides the foundation for building a focused, effective web application that addresses Near's immediate needs without unnecessary complexity. The emphasis on resume quality, standardization, and usability will ensure that the resulting database becomes a valuable asset for the entire organization.
