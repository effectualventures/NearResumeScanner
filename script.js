// Global variables
let selectedFile = null;
let enhancedResumeHTML = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBox = document.getElementById('uploadBox');
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadBox.addEventListener('click', () => fileInput.click());
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        setSelectedFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        setSelectedFile(files[0]);
    }
}

function setSelectedFile(file) {
    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        showError('Please upload a PDF, DOC, DOCX, or TXT file.');
        return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB.');
        return;
    }
    
    selectedFile = file;
    
    // Update UI
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('processBtn').disabled = false;
}

function removeFile() {
    selectedFile = null;
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('processBtn').disabled = true;
    document.getElementById('fileInput').value = '';
}

async function processResume() {
    if (!selectedFile) {
        showError('Please select a file first.');
        return;
    }
    
    // Show processing UI
    showSection('processingSection');
    
    try {
        // Extract text from file
        const extractedText = await extractTextFromFile(selectedFile);
        
        // Get settings
        const detailedFormat = document.getElementById('detailedFormat').checked;
        
        // Process with OpenAI
        const enhancedResume = await enhanceResumeWithAI(extractedText, detailedFormat);
        
        // Show results
        displayResults(enhancedResume);
        
    } catch (error) {
        console.error('Processing error:', error);
        showError('Failed to process resume: ' + error.message);
    }
}

async function extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const text = e.target.result;
            
            if (file.type === 'text/plain') {
                resolve(text);
            } else {
                // For PDF/DOC files, we'll need the text content
                // In a real implementation, you'd use libraries like pdf-parse
                // For now, we'll ask the user to provide text or use a simpler approach
                resolve(text);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        
        if (file.type === 'text/plain') {
            reader.readAsText(file);
        } else {
            // For now, ask user to paste text content
            const textContent = prompt('Please paste the text content of your resume:');
            if (textContent) {
                resolve(textContent);
            } else {
                reject(new Error('Text content is required'));
            }
        }
    });
}

async function enhanceResumeWithAI(resumeText, detailedFormat) {
    // Check for OpenAI API key
    const apiKey = getOpenAIKey();
    if (!apiKey) {
        throw new Error('OpenAI API key is required. Please set your OPENAI_API_KEY.');
    }
    
    const systemPrompt = buildSystemPrompt(detailedFormat);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: resumeText }
            ],
            temperature: 0.3
        })
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    try {
        const resumeData = JSON.parse(content);
        return generateHTMLFromResume(resumeData);
    } catch (parseError) {
        // If JSON parsing fails, return the content as-is
        return content;
    }
}

function getOpenAIKey() {
    // First check if it's set as an environment variable or in localStorage
    let apiKey = localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
        // Prompt user for API key
        apiKey = prompt('Please enter your OpenAI API key:');
        if (apiKey) {
            localStorage.setItem('openai_api_key', apiKey);
        }
    }
    
    return apiKey;
}

function buildSystemPrompt(detailedFormat) {
    return `You are an expert resume writer and career coach. Transform the provided resume into a professional, ATS-optimized format that will impress hiring managers.

Key requirements:
1. Create a compelling professional summary (2-3 sentences) that highlights expertise and value proposition - DO NOT include made-up percentage metrics
2. Organize experience in reverse chronological order
3. Enhance bullet points with strong action verbs and quantifiable achievements where possible
4. Optimize for ATS systems with clear headings and keywords
5. Use professional formatting and consistent style
6. ${detailedFormat ? 'Use detailed format suitable for 10+ years experience' : 'Keep format concise for early-mid career'}

Return the result as JSON with this structure:
{
  "header": {
    "firstName": "Name",
    "tagline": "Professional Title",
    "location": "City, State"
  },
  "summary": "Professional summary without made-up metrics",
  "skills": [
    {
      "category": "Technical Skills",
      "items": ["skill1", "skill2"]
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY",
      "bullets": [
        {"text": "Achievement with metrics when available"}
      ]
    }
  ],
  "education": [
    {
      "institution": "School Name",
      "degree": "Degree Type",
      "location": "City, State",
      "year": "YYYY"
    }
  ]
}`;
}

function generateHTMLFromResume(resumeData) {
    return `
    <div style="font-family: Calibri, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <header style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 24px; margin-bottom: 5px; color: #2c3e50;">${resumeData.header.firstName}</h1>
            <h2 style="font-size: 16px; margin-bottom: 5px; color: #7f8c8d; font-weight: normal;">${resumeData.header.tagline}</h2>
            <p style="font-size: 14px; color: #7f8c8d;">${resumeData.header.location}</p>
        </header>

        <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px;">PROFESSIONAL SUMMARY</h3>
            <p style="font-size: 14px; line-height: 1.6; color: #2c3e50;">${resumeData.summary}</p>
        </section>

        <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px;">SKILLS</h3>
            ${resumeData.skills.map(skillGroup => `
                <div style="margin-bottom: 10px;">
                    <strong style="font-size: 14px; color: #2c3e50;">${skillGroup.category}:</strong>
                    <span style="font-size: 14px; color: #2c3e50; margin-left: 10px;">${skillGroup.items.join(', ')}</span>
                </div>
            `).join('')}
        </section>

        <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px;">PROFESSIONAL EXPERIENCE</h3>
            ${resumeData.experience.map(exp => `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
                        <h4 style="font-size: 15px; color: #2c3e50; margin: 0;">${exp.title}</h4>
                        <span style="font-size: 13px; color: #7f8c8d;">${exp.startDate} - ${exp.endDate}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong style="font-size: 14px; color: #2c3e50;">${exp.company}</strong>
                        <span style="font-size: 13px; color: #7f8c8d;">${exp.location}</span>
                    </div>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${exp.bullets.map(bullet => `
                            <li style="font-size: 14px; line-height: 1.5; margin-bottom: 5px; color: #2c3e50;">${bullet.text}</li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
        </section>

        <section>
            <h3 style="font-size: 16px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px;">EDUCATION</h3>
            ${resumeData.education.map(edu => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                        <strong style="font-size: 14px; color: #2c3e50;">${edu.degree}</strong>
                        <div style="font-size: 14px; color: #2c3e50;">${edu.institution}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 13px; color: #7f8c8d;">${edu.year}</div>
                        <div style="font-size: 13px; color: #7f8c8d;">${edu.location}</div>
                    </div>
                </div>
            `).join('')}
        </section>
    </div>`;
}

function displayResults(htmlContent) {
    enhancedResumeHTML = htmlContent;
    document.getElementById('resumePreview').innerHTML = htmlContent;
    showSection('resultsSection');
}

function downloadHTML() {
    if (!enhancedResumeHTML) return;
    
    const blob = new Blob([enhancedResumeHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enhanced_resume.html';
    a.click();
    URL.revokeObjectURL(url);
}

function downloadPDF() {
    // For PDF generation, we'd need a library like jsPDF or print to PDF
    alert('PDF download feature coming soon! For now, you can print the preview as PDF using your browser.');
}

function showSection(sectionId) {
    // Hide all sections
    const sections = ['uploadSection', 'processingSection', 'resultsSection', 'errorSection'];
    sections.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    
    // Show the specified section
    document.getElementById(sectionId).style.display = 'block';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    showSection('errorSection');
}

function resetApp() {
    selectedFile = null;
    enhancedResumeHTML = null;
    removeFile();
    showSection('uploadSection');
}