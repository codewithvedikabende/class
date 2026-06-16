const { GoogleGenAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

// Access API Key from env
const apiKey = process.env.GEMINI_API_KEY;

let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn('WARNING: GEMINI_API_KEY is missing. AI features will run in mock fallback mode.');
}

/**
 * Helper to call Gemini model and optionally return structured JSON
 */
async function callGemini(prompt, isJson = false, systemInstruction = '') {
  if (!ai) {
    return mockResponse(prompt);
  }

  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction || undefined,
    });

    const generationConfig = isJson ? { responseMimeType: 'application/json' } : undefined;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();
    
    if (isJson) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse Gemini JSON output. Raw output:', text);
        // Fallback matching to find JSON block in output
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Gemini did not return valid JSON: ' + text);
      }
    }

    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

/**
 * Fallback mock generator when API key is not provided
 */
function mockResponse(prompt) {
  console.log('Using fallback mock AI generator for prompt:', prompt.substring(0, 100) + '...');
  
  if (prompt.includes('questions') || prompt.includes('question')) {
    return JSON.stringify({
      questions: [
        {
          id: 'q1',
          text: 'Can you describe a challenging project you worked on and how you handled difficulties?',
          type: 'behavioral',
          difficulty: 'Medium',
          idealKeywords: ['problem-solving', 'collaboration', 'resilience', 'planning'],
          hints: 'Focus on a specific project, explain the conflict/hurdle, your exact actions, and the positive result (STAR method).'
        },
        {
          id: 'q2',
          text: 'What are the main differences between relational databases like MySQL and non-relational databases like MongoDB?',
          type: 'technical',
          difficulty: 'Medium',
          idealKeywords: ['SQL', 'NoSQL', 'schema-less', 'scaling', 'document', 'tables'],
          hints: 'Discuss schema flexibility, scaling (vertical vs horizontal), and use cases for structured vs unstructured data.'
        }
      ]
    });
  }

  if (prompt.includes('evaluate') || prompt.includes('feedback') || prompt.includes('score')) {
    return JSON.stringify({
      score: 82,
      strengths: ['Clear explanation of relational concepts', 'Mention of horizontal scaling', 'Structured delivery'],
      weaknesses: ['Did not explain transactions or ACID compliance differences in detail', 'Slightly slow speaking pace'],
      suggestedAnswer: 'Relational databases are table-based with strict schemas, ideal for transactions (ACID compliant). NoSQL databases are document-based, key-value, or graph-oriented, supporting dynamic schemas and excellent horizontal scalability for large unstructured datasets.',
      fillerWordCount: 3,
      pronunciationScore: 85,
      fluencyScore: 80,
      speakingSpeedWpm: 125,
      recommendation: 'Research transaction support in MongoDB vs SQL. Focus on minimizing filler words like "um" and "ah".'
    });
  }

  if (prompt.includes('resume') || prompt.includes('ATS')) {
    return JSON.stringify({
      score: 78,
      atsCompatible: true,
      formattingIssues: ['Avoid double-column formats for older ATS engines', 'Ensure headers use clean typography'],
      grammarCheck: 'Excellent, no major typos found.',
      missingSkills: ['Docker', 'CI/CD Pipelines', 'TypeScript'],
      projectFeedback: 'Your projects have strong descriptions, but would benefit from quantifying impact (e.g., "improved loading speed by 25%").',
      suggestions: [
        'Add a brief summary section at the top focusing on target roles.',
        'Incorporate cloud platforms (AWS/GCP) or containerization keywords.'
      ]
    });
  }

  if (prompt.includes('roadmap') || prompt.includes('career')) {
    return JSON.stringify({
      role: 'Full Stack Developer',
      timelineWeeks: 12,
      skills: ['HTML/CSS/JS', 'Node.js & Express', 'MongoDB & SQL', 'React or Flutter', 'Deployment & CI/CD'],
      milestones: [
        {
          week: 'Weeks 1-3',
          title: 'Frontend Fundamentals & Responsive UI',
          topics: ['Modern CSS Grid/Flexbox', 'Dart/Flutter UI layouts', 'State management basics'],
          projects: ['Build a Personal Portfolio website or simple calculator App'],
          certifications: ['Responsive Web Design by FreeCodeCamp']
        },
        {
          week: 'Weeks 4-7',
          title: 'Backend Services & Database Design',
          topics: ['Node.js Event Loop', 'REST API design with Express', 'MongoDB schema modeling'],
          projects: ['Build a task manager backend with database authentication'],
          certifications: ['Node.js Developer Certificate by OpenJS']
        },
        {
          week: 'Weeks 8-12',
          title: 'Full System Integration & Deployments',
          topics: ['Connecting Flutter to Express APIs', 'JSON Web Tokens', 'Cloud hosting (Render/AWS)'],
          projects: ['Deploy InterviewAce AI complete project stack'],
          certifications: ['AWS Certified Cloud Practitioner']
        }
      ]
    });
  }

  return 'I am your InterviewAce Career Coach. How can I assist you with your career growth today?';
}

/**
 * Generate Adaptive Questions
 */
async function generateInterviewQuestions(role, difficulty, company = 'General', history = []) {
  const prompt = `
    Generate a list of 3 mock interview questions for an applicant seeking a job.
    Role: ${role}
    Difficulty: ${difficulty}
    Target Company: ${company}
    Previous interview conversation history: ${JSON.stringify(history)}

    Respond strictly in JSON format matching this schema:
    {
      "questions": [
        {
          "id": "string (unique code)",
          "text": "string (the actual question)",
          "type": "string (technical, behavioral, or hr)",
          "difficulty": "string (Beginner, Intermediate, Advanced)",
          "idealKeywords": ["string", "string"],
          "hints": "string (brief suggestion or framework like STAR to guide the user)"
        }
      ]
    }
  `;
  const systemInstruction = 'You are a senior professional technical interviewer at top tier technology firms. Your job is to generate highly relevant, challenging, and adaptive interview questions.';
  return callGemini(prompt, true, systemInstruction);
}

/**
 * Evaluate single answer response (Text or voice script)
 */
async function evaluateSingleAnswer(question, answer, mode = 'text') {
  const prompt = `
    Evaluate the following interview answer:
    Question: ${question}
    User Answer: ${answer}
    Evaluation Mode: ${mode}

    Provide feedback on correctness, vocabulary, completeness, and structure.
    If the mode is 'voice', include voice analytics guesses based on the answer length and flow (like fluency, speaking speed, filler word detection).

    Respond strictly in JSON format matching this schema:
    {
      "score": number (0 to 100),
      "strengths": ["string"],
      "weaknesses": ["string"],
      "suggestedAnswer": "string (an outstanding response showing how a candidate should have answered)",
      "fillerWordCount": number (filler words like like, um, ah, basically, you know),
      "pronunciationScore": number (0-100 placeholder or simulated score),
      "fluencyScore": number (0-100),
      "speakingSpeedWpm": number (words per minute),
      "recommendation": "string (actionable advice to improve)"
    }
  `;
  const systemInstruction = 'You are an expert recruitment consultant and communications coach. You provide honest, rigorous feedback and suggest superior ways to pitch candidate accomplishments.';
  return callGemini(prompt, true, systemInstruction);
}

/**
 * Parse Resume PDF text & check ATS suitability
 */
async function analyzeResumeATS(resumeText, targetRole = 'Software Engineer') {
  const prompt = `
    Analyze this candidate's resume text against the target role of: "${targetRole}"
    Resume Text:
    ---
    ${resumeText}
    ---

    Evaluate:
    1. ATS compatibility score (0-100)
    2. Missing key technical skills, frameworks, or tools common for a ${targetRole}
    3. Document formatting issues (columns, tables, parsing errors)
    4. Quality of project descriptions and quantification of achievements
    5. Structural and grammar feedback

    Respond strictly in JSON format matching this schema:
    {
      "score": number (ATS compatibility score out of 100),
      "atsCompatible": boolean,
      "formattingIssues": ["string"],
      "grammarCheck": "string",
      "missingSkills": ["string"],
      "projectFeedback": "string",
      "suggestions": ["string"]
    }
  `;
  const systemInstruction = 'You are an automated Applicant Tracking System (ATS) parsing parser and a resume writing consultant.';
  return callGemini(prompt, true, systemInstruction);
}

/**
 * Generate customized learning roadmaps
 */
async function generateCareerRoadmap(dreamRole, currentSkills = '', timelineWeeks = 12) {
  const prompt = `
    Create a highly personalized, structured career and skills roadmap for a student wanting to become a: "${dreamRole}".
    Current Skills: ${currentSkills}
    Preferred learning timeline: ${timelineWeeks} weeks.

    Provide sequential milestones containing topics, mini-projects, and globally recognized certificates or resources.

    Respond strictly in JSON format matching this schema:
    {
      "role": "string",
      "timelineWeeks": number,
      "skills": ["string"],
      "milestones": [
        {
          "week": "string (e.g., Weeks 1-2)",
          "title": "string (Milestone title)",
          "topics": ["string"],
          "projects": ["string (concrete practical projects to build)"],
          "certifications": ["string (relevant certifications or courses)"]
        }
      ]
    }
  `;
  const systemInstruction = 'You are an elite career development officer, mentor, and curriculum designer.';
  return callGemini(prompt, true, systemInstruction);
}

/**
 * AI Career Coach Chat Message Response
 */
async function chatCareerCoach(message, chatHistory = []) {
  // Format history for Gemini API
  const formattedHistory = chatHistory.map(h => `${h.sender === 'user' ? 'Candidate' : 'Coach'}: ${h.text}`).join('\n');
  const prompt = `
    You are InterviewAce Coach, a supportive 24/7 placement and career preparation expert.
    
    Conversation History:
    ${formattedHistory}
    
    Candidate's message: "${message}"
    
    Provide helpful, professional, and structured advice. Keep it interactive, positive, and clear.
  `;
  return callGemini(prompt, false, 'You are InterviewAce Coach, an AI career mentor.');
}

module.exports = {
  generateInterviewQuestions,
  evaluateSingleAnswer,
  analyzeResumeATS,
  generateCareerRoadmap,
  chatCareerCoach,
};
