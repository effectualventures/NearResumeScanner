# Near Resume Processor - Core Principles & Prompt Engineering

## Project Background & Context

Near's resume database needs significant improvement to support business growth and enhance sales efforts. Currently, the process of creating, formatting, and managing professional resumes is inconsistent and manual. This document outlines the core principles, detailed requirements, and prompt engineering guidelines to create a system that transforms raw resumes into high-quality, standardized assets for the business.

The goal is to build a database of 200-500 exceptional "Americanized" resumes from Latin American talent that can be easily shared with prospects and clients. This database will power outbound efforts, help generate leads, provide immediate examples during prospect calls, and establish Near as a source of premium international talent.

## Core Business Objectives

1. **Create a powerful sales & marketing asset**: The resume database is primarily a sales tool that showcases the quality of Near's talent pool.

2. **Standardize presentation**: All resumes should follow a consistent, professional format that presents candidates in the best possible light.

3. **Improve content quality**: Enhance resume content with quantifiable achievements and concise, impactful language.

4. **Support GTM efforts**: Enable Account Executives, SDRs, recruiters, founders, and marketing to leverage resumes in various scenarios.

5. **Build searchable database**: Create a system where resumes can be easily categorized, found, and shared.

## Resume Standard: The "Americanized" Format

The system should transform Latin American resumes into formats that are indistinguishable from high-quality US resumes. This is crucial because:

1. US companies would prefer to hire domestically but choose Latin American talent due to cost advantages
2. Resumes must demonstrate that candidate quality is on par with US talent
3. The format should avoid any "foreign-sounding" elements that might create unconscious bias

### Header Format

- **Name**: First name only (anonymized for client-facing versions)
- **Professional Title**: Crisp, refined role title (5 words or fewer)
  - Example: "Senior Sales Development Leader" 
  - Avoid phrases like "Pipeline Leader" that may sound unusual to US employers
- **Location**: City, Country
- **Horizontal divider**: Simple line under the header

### Structure & Sections (in order)

1. **Summary**: Concise professional summary highlighting key expertise and achievements
2. **Skills & Tools**: Compact list of technical skills, tools, and language proficiency
3. **Professional Experience**: Reverse chronological work history with achievements
4. **Education**: Degree, major, university, and graduation year
5. **Additional Experience** (if space permits): Brief mention of other relevant roles

### Formatting Requirements

- **Page Length**: Strictly one page maximum
- **Font**: Calibri or Arial, 11pt (10.5pt if needed to fit on one page)
- **Margins**: 0.7" on all sides
- **Section Headers**: BOLD ALL CAPS, left-aligned
- **Company Line**: "Company — Location" left-aligned, dates right-aligned
- **Job Title**: Italic, directly beneath company line
- **Bullets**: Solid round bullets (•) with period at end
- **Tense**: Past tense for all bullets except current role
- **Date Format**: Three-letter month abbreviations (e.g., "Jan 2023 – Present")
- **Footer**: Near logo in bottom-right, 0.4" from bottom edge

## Content Enhancement Principles

### Resume Transformation Rules

1. **Quantifiable Achievements**:
   - Every resume must showcase specific, measurable accomplishments
   - Add numbers where missing (must be believable and contextually appropriate)
   - Format: K for thousands, M for millions, B for billions (no decimals)
   - Example: "Generated $1.2M in new pipeline" NOT "Generated significant pipeline"

2. **Currency Conversion**:
   - Convert local currency to USD equivalent using static conversion rates (NO external API)
   - Format as: "200M MXN ($11M USD)"
   - Round to nearest $1K for amounts under $1M
   - Round to nearest $100K for amounts $1M or more

3. **Bullet Prioritization**:
   - Most impressive achievements should appear first within each role
   - For sales roles: prioritize revenue impact metrics (e.g., "Sourced a $1.2M deal")
   - For leadership roles: highlight team size + quantifiable results
   - For technical roles: emphasize systems built, improvements made, and their impact

4. **Bullet Point Allocation**:
   - Allocate more bullets to recent, relevant, and longer-tenure positions
   - Current role or roles directly related to target job: up to 5 bullets
   - Mid-career relevant roles: 2-4 bullets
   - Early/less relevant roles: 1-2 bullets
   - Very old/unrelated stints: list as "Additional Experience" line (no bullets)

5. **Short-Stint Handling**:
   - Roles ≤ 6 months are considered "short stints"
   - Short stints receive fewer bullets regardless of recency
   - If cuts are needed to fit on one page, short stints are compressed first

6. **Page-Fitting Logic** (hierarchical hybrid approach):
   - Stage 1: Tighten verbose bullets (120-150 chars max), starting with oldest roles
   - Stage 2: Reduce bullets from oldest roles until each has max 2 bullets
   - Stage 3: If still too long, remove lowest-impact bullets based on scoring
   - Note: The system should flag removed content to the user

### Content Creation Guidelines

1. **Professional Summary**:
   - One concise sentence highlighting expertise, experience, and standout achievements
   - Include years of experience, key domains, and most impressive metrics
   - Example format: "Senior [role] with [X]+ years [driving/building/leading] [domain] across [regions/industries]; [standout achievement]."

2. **Skills & Tools Section**:
   - Place directly after summary
   - Format as categorical list: "Category | Specific Tools • Category | Specific Tools"
   - Include technical skills, tools, platforms, and language proficiency with levels
   - Example: "CRM | Salesforce • Sequencing | Outreach • Languages | English C2, Spanish C1"

3. **Role Title Refinement**:
   - Create a crisp, professional title that accurately reflects responsibilities
   - Avoid unnecessary words or unusual terminology
   - Example: "Senior Sales Development Leader" (good) vs "LATAM Pipeline Builder & SDR Coach" (too wordy/unusual)

4. **Bullet Point Writing Style**:
   - Start with strong action verbs
   - Focus on achievements, not just responsibilities
   - Include specific metrics, percentages, dollars where applicable
   - End with business impact when possible
   - Example: "Launched performance dashboards that cut rep ramp time from 90 → 60 days."

5. **Education Formatting**:
   - Include: University name — Degree, Major, Location, Years
   - Optional (space permitting): GPA, honors, relevant coursework
   - Example: "Universidad Sergio Arboleda — B.A. in Business, Bogotá, Colombia, 2015-2020"

## Anonymization Guidelines

For client-facing resumes, certain personally identifiable information must be removed:

1. **Must Remove**:
   - Last name (use first name only)
   - Phone number
   - Email address
   - Street address
   - LinkedIn URL
   - Personal website URLs

2. **Must Keep**:
   - First name
   - Location (City, Country)
   - All quantifiable achievements
   - Educational institutions
   - Companies worked for

3. **File Naming Standard**:
   - Format: "Role (Country) – C-XXXX.pdf"
   - Example: "Senior SDR (Colombia) – C-4583.pdf"
   - The C-XXXX code provides uniqueness for internal tracking

## Resume Processing Logic

### Input Analysis & Understanding

The system must analyze the original resume to understand:

1. **Role Hierarchy**: Identify current, past, and short-stint roles
2. **Achievement Identification**: Extract existing metrics and quantifiable results
3. **Skills Extraction**: Identify technical skills and competencies
4. **Content Quality Assessment**: Evaluate which sections need enhancement
5. **Page-Fit Evaluation**: Determine if content will require compression

### Content Enhancement Process

The system should apply these transformations:

1. **Summary Creation**: If no summary exists, create one based on experience
2. **Skills Standardization**: Format skills section according to guidelines
3. **Bullet Enhancement**:
   - Strengthen vague bullets with specific achievements
   - Add reasonable metrics where missing
   - Convert passive language to active voice
   - Ensure all achievements align with role and industry context
4. **Currency Conversion**: Apply conversion rules for local currencies
5. **Grammar & Spelling**: Correct any issues to ensure perfect English
6. **Page-Length Control**: Apply hierarchical hybrid approach to maintain one page

## Special Cases Handling

### Multi-Page Resumes

Many Latin American resumes exceed one page. The system must:

1. Prioritize content from most recent/relevant roles
2. Compress verbose bullet points
3. Apply the hierarchical hybrid approach for trimming
4. Focus on keeping quantifiable achievements
5. Remove older or less relevant positions if necessary

### Non-English Resumes

If processing resumes in Spanish, Portuguese, or other languages:

1. Translate all content to professional US business English
2. Ensure perfect grammar and idiomatic language
3. Apply all the same content enhancement principles
4. Verify industry-specific terminology is correctly translated

### Industry-Specific Considerations

Different industries require different emphasis:

1. **Sales/BDR Roles**: Prioritize revenue impact, quota attainment, deals closed
2. **Engineering**: Emphasize technologies, systems built, performance improvements
3. **Finance/Accounting**: Highlight process improvements, cost savings, compliance achievements

## Resume Quality Criteria

All processed resumes should meet these quality standards:

1. **Professional Appearance**: Clean, consistent formatting that meets all style guidelines
2. **Quantifiable Impact**: Multiple specific metrics demonstrating achievement
3. **Concise Language**: No unnecessary words or verbose descriptions
4. **Logical Flow**: Natural progression from most to least important points
5. **Contextual Fit**: Content appropriate to role and industry
6. **One-Page Format**: All content fits on a single page without appearing cramped
7. **Perfect Grammar**: No spelling or grammatical errors
8. **Americanized Language**: US business English with no foreign-sounding phrasing

## Prompt Engineering Guide

This section provides detailed prompt engineering guidance for the language model powering the resume processor. The prompt needs to handle both initial transformation and post-processing chat adjustments.

### Foundation Prompt (System Message)

```
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
- Consistent formatting throughout

ANONYMIZATION:
- Remove last name, phone, email, street address, LinkedIn URL
- Keep first name, location, companies, education institutions

Your output should present the candidate as a confident, accomplished professional who would be indistinguishable from top US talent in the same field.
```

### Initial Resume Processing Prompt

```
TASK: Transform the following resume into a high-quality, one-page "Americanized" format following Near's resume standards.

ORIGINAL RESUME:
[INSERT FULL RESUME TEXT HERE]

FORMAT YOUR RESPONSE IN THESE SECTIONS:

1. ANALYSIS:
- Provide a brief analysis of the original resume
- Identify key strengths and weaknesses
- Note any areas needing significant enhancement

2. TRANSFORMED RESUME:
- Return the complete transformed resume in plain text format
- Follow all formatting and content guidelines
- Ensure it fits on one page

3. ENHANCEMENT NOTES:
- List any significant changes or enhancements made
- Explain any assumptions or additions (e.g., added metrics)
- Note any content that was deprioritized or removed to fit one page
```

### Chat Adjustment Prompt

```
CONTEXT: You're helping adjust a processed resume. You have the original resume and the transformed version. The user will request specific adjustments.

ORIGINAL RESUME:
[INSERT ORIGINAL RESUME TEXT]

CURRENT TRANSFORMED RESUME:
[INSERT CURRENT TRANSFORMED RESUME TEXT]

GUIDELINES FOR ADJUSTMENTS:
1. Make targeted changes without disrupting the overall format
2. Maintain one-page length (if adding content, recommend what to remove)
3. Keep all anonymization requirements
4. Ensure any added content maintains professional quality standards
5. If a request would violate the guidelines, explain why and suggest alternatives

For each adjustment request:
- Confirm your understanding of the request
- Explain what specific changes you'll make
- Show the updated bullet or section
- Note any other sections affected (e.g., if trimming needed elsewhere)
```

### Example Adjustment Interactions

These example interactions demonstrate how the system should handle various adjustment requests:

#### Example 1: Enhancing a specific bullet

**User**: "The second bullet under Toshiba doesn't sound impressive enough. Can you make it stronger?"

**System Response**:
```
I understand you'd like to enhance the impact of the second bullet under Toshiba. Here's how I'll improve it:

Current bullet:
• Manage and coach 3 BDRs, lifting qualified pipeline 30% through targeted outbound sequences.

Enhanced bullet:
• Transformed a 3-person BDR team into top performers, increasing qualified pipeline 30% and reducing sales cycle by 15 days through implementation of targeted outbound sequences.

This revision adds more specific impact (reduced sales cycle) and emphasizes the transformation rather than just management. The bullet remains factual while demonstrating stronger leadership impact.
```

#### Example 2: Adding a missing skill

**User**: "This person also has experience with HubSpot Marketing Hub that's not mentioned. Can you add it?"

**System Response**:
```
I'll add HubSpot Marketing Hub to the Skills & Tools section:

Current Skills & Tools:
CRM | Salesforce • Sequencing | Outreach / SalesLoft • Languages | English C2, Spanish C1

Updated Skills & Tools:
CRM | Salesforce • Marketing | HubSpot • Sequencing | Outreach / SalesLoft • Languages | English C2, Spanish C1

I've added it as a dedicated marketing tool category to highlight this valuable skill. The updated section still fits within our format guidelines and maintains the one-page layout.
```

#### Example 3: Handling a request that violates guidelines

**User**: "Can you add their phone number and email to the header?"

**System Response**:
```
I understand you'd like to add contact information to the resume. However, our guidelines for client-facing resumes require anonymization, which means removing phone numbers, email addresses, and other personal contact details.

The anonymized resumes are designed to showcase talent quality while protecting candidate privacy until later in the process. The internal version stored in Airtable would retain all contact information.

Instead, I could:
1. Add a brief note about preferred contact methods (e.g., "Available for immediate interviews via video call")
2. Add more detail about language proficiency or time zone availability
3. Enhance another area of the resume that would add value for clients

Would any of these alternatives be helpful?
```

## Resume Examples Before & After

To illustrate the transformation principles, here are conceptual examples showing the contrast between original and transformed resumes:

### Example 1: Before Transformation

* Too verbose with multi-line bullets
* No clear quantifiable achievements
* Inconsistent formatting
* Exceeds one page
* No clear skills section
* Weak professional summary

### Example 1: After Transformation

* Concise one-sentence professional summary
* Clear, categorized skills section
* Quantified achievements with specific metrics
* Consistent formatting throughout
* Fits on one page with appropriate whitespace
* Bullets prioritized by impact and relevance

### Example 2: Before Transformation

* Missing professional summary
* Technical jargon without context
* No quantifiable achievements
* Poor organization of experience
* Unclear role progression
* Excessive detail on education

### Example 2: After Transformation

* Strong professional summary highlighting key expertise
* Technical skills organized by category
* Added quantifiable impact metrics
* Clear chronological organization
* Demonstrated career progression
* Concise education section

## Comprehensive Prompt Engineering

The language model prompt is the core of the resume processing system. It must capture all the subtle nuances and decision-making logic discussed in this document.

### Detailed Resume Analysis Prompt

The system should first analyze the resume holistically:

```
Analyze this resume comprehensively:

1. ROLE ASSESSMENT:
- Identify current role and its recency
- Categorize previous roles by relevance and tenure
- Flag any short-stint positions (≤6 months)

2. CONTENT QUALITY:
- Evaluate existing quantifiable achievements
- Identify vague statements needing enhancement
- Assess overall language quality and professionalism

3. TECHNICAL ELEMENTS:
- Extract key skills and competencies
- Identify technical tools and platforms
- Note language proficiencies and levels

4. FORMAT EVALUATION:
- Calculate approximate content volume vs. one-page target
- Identify sections needing compression
- Note any unusual formatting elements

5. ACHIEVEMENT POTENTIAL:
- Identify roles/responsibilities that likely had metrics (even if not stated)
- Note industry-specific achievements that could be added
- Determine appropriate metric ranges for this role/industry
```

### Decision Logic Prompt Components

The system needs detailed decision-making logic for various aspects of resume processing:

#### Bullet Prioritization Logic

```
For each role, evaluate bullets using this prioritization framework:

HIGHEST PRIORITY:
- Direct revenue impact with specific $ amounts
- Percentage improvements to key metrics (efficiency, performance, etc.)
- Team leadership with size and measurable outcomes
- Awards or recognition with specific context

MEDIUM PRIORITY:
- Process improvements with qualitative outcomes
- Project leadership without specific metrics
- Client/stakeholder management
- Technical implementation details

LOWEST PRIORITY:
- General responsibilities without outcomes
- Routine administrative tasks
- Vague descriptions of team participation
- Training or certification mentions without application

Sort bullets within each role by priority level.
```

#### Content Enhancement Decision Tree

```
Apply this decision tree to enhance each bullet:

1. Does the bullet contain specific metrics? 
   - YES → Ensure format follows standards (K/M/B, no decimals)
   - NO → Continue to step 2

2. Is this a role where metrics would be expected?
   - YES → Add appropriate metrics based on role context
   - NO → Continue to step 3

3. Does the bullet describe an achievement?
   - YES → Strengthen language and add context
   - NO → Convert responsibility to achievement with outcome

4. Is the bullet longer than 150 characters?
   - YES → Compress while preserving key information
   - NO → Ensure strong action verb and impact

5. Is local currency mentioned?
   - YES → Add USD equivalent in parentheses
   - NO → No change needed

6. Is the bullet in past tense (except current role)?
   - YES → No change needed
   - NO → Convert to appropriate tense
```

#### Page-Fitting Algorithm

```
If content exceeds one page, apply this algorithm sequentially until it fits:

STEP 1: Verbose Bullet Compression
- Identify bullets > 150 characters
- Prioritize compressing bullets in oldest/least relevant roles first
- Compress to ~120 characters while preserving key metrics

STEP 2: Role-Based Trimming
- For oldest roles, reduce to max 1-2 bullets
- For short-stint roles (≤6 months), reduce to 1 bullet
- Collapse very old roles into "Additional Experience" line

STEP 3: Impact-Based Pruning
- Score remaining bullets by impact (metrics, relevance, etc.)
- Remove lowest-scoring bullets across all roles
- Preserve at least 1 bullet per role where possible

STEP 4: Last Resort Options
- Reduce font size slightly (11pt → 10.5pt)
- Reduce margins slightly (0.7" → 0.6")
- Condense section spacing minimally

Flag all removed content for potential review.
```

## Complete End-to-End Prompt

Combining all elements, the complete system prompt would be structured as:

```
You are an expert resume transformation specialist for Near, a company connecting Latin American talent with US companies. Your task is to convert raw resumes into polished, "Americanized" one-page documents that showcase candidates as top-tier professionals.

# FORMAT SPECIFICATIONS
[Full formatting requirements as detailed earlier]

# CONTENT TRANSFORMATION RULES
[Complete content enhancement rules]

# DECISION LOGIC
[Bullet prioritization framework]
[Content enhancement decision tree]
[Page-fitting algorithm]

# ANALYSIS PROCESS
1. First analyze the resume holistically
2. Identify strengths, weaknesses, and enhancement opportunities
3. Determine appropriate metrics based on role and industry
4. Plan compression strategy if needed for one-page fit

# OUTPUT REQUIREMENTS
1. Provide the transformed resume in plain text format
2. Follow all formatting and content guidelines
3. Add brief notes explaining significant enhancements
4. Highlight any content that was deprioritized or removed

# QUALITY STANDARDS
[Complete quality criteria]

ORIGINAL RESUME:
[Resume text will be inserted here]
```

## Implementation Recommendations

For optimal implementation of these principles in a web application:

1. **Split Processing into Stages**:
   - Stage 1: Initial analysis and understanding
   - Stage 2: Content enhancement and formatting
   - Stage 3: Page-fitting and optimization
   - Stage 4: Final quality check

2. **Provide Transparency to Users**:
   - Show "before and after" comparison
   - Highlight enhanced bullets and added metrics
   - Note any content that was deprioritized or removed
   - Allow user to adjust priorities if needed

3. **Enable Targeted Adjustments**:
   - Let users request specific changes to bullets or sections
   - Maintain context of full resume when making targeted changes
   - Preserve formatting and one-page requirement during adjustments

4. **Quality Assurance Mechanisms**:
   - Check for inconsistencies in tense, formatting, or style
   - Verify that all enhancements remain factually plausible
   - Ensure anonymization requirements are consistently applied

## Continuous Improvement

The system should improve over time through:

1. **User Feedback Collection**:
   - Track which resumes receive positive client feedback
   - Note common adjustment requests after initial processing
   - Identify patterns in manual user improvements

2. **Prompt Refinement**:
   - Regularly update industry-specific achievement benchmarks
   - Refine bullet enhancement techniques based on performance
   - Adjust page-fitting algorithm based on success patterns

3. **Example Database**:
   - Build a library of exemplary "before and after" transformations
   - Use top examples to further train the system
   - Categorize by industry, role, and enhancement type

## Conclusion

This document captures the comprehensive principles, detailed requirements, and prompt engineering guidelines for Near's Resume Processor. By following these specifications, the system will transform raw resumes into powerful sales and marketing assets that present Latin American talent in the best possible light while maintaining factual accuracy and professional credibility.

The underlying philosophy is to create resumes that are:
1. Indistinguishable from top US talent in formatting and language
2. Rich with quantifiable achievements and specific metrics
3. Professionally formatted to exacting standards
4. Concise enough to fit on one compelling page
5. Tailored to highlight the most impressive and relevant experience

This approach will enable Near to build a premium resume database that becomes a valuable asset for sales, marketing, and client relationships.
