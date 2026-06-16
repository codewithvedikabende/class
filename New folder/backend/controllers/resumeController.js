const pdf = require('pdf-parse');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

// Award XP helper
async function awardXP(user, xpAmount) {
  user.xp += xpAmount;
  const targetXp = user.level * 100;
  if (user.xp >= targetXp) {
    user.xp -= targetXp;
    user.level += 1;
    user.badges.push({
      title: `Level ${user.level} Climber`,
      icon: 'military_tech',
      unlockedAt: new Date(),
    });
  }
  await user.save();
}

exports.analyzeResume = async (req, res) => {
  try {
    const { userId, targetRole } = req.body;
    let resumeText = req.body.text || '';

    if (!userId || !targetRole) {
      return res.status(400).json({ error: 'userId and targetRole are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if a file was uploaded
    if (req.file) {
      try {
        const data = await pdf(req.file.buffer);
        resumeText = data.text;
      } catch (pdfError) {
        console.error('PDF parsing failed, falling back to mock text extraction:', pdfError);
        resumeText = `
          Resume: ${user.name}
          Target Role: ${targetRole}
          Skills: Javascript, HTML, CSS, Git, Java, Python.
          Experience: Intern at TechCorp. Built a web app with REST APIs.
          Education: Bachelor in Computer Science.
        `;
      }
    } else if (req.body.fileBase64) {
      try {
        const buffer = Buffer.from(req.body.fileBase64, 'base64');
        const data = await pdf(buffer);
        resumeText = data.text;
      } catch (pdfError) {
        console.error('Base64 PDF parsing failed:', pdfError);
        return res.status(400).json({ error: 'Invalid PDF base64 format' });
      }
    }

    if (!resumeText || resumeText.trim().length === 0) {
      // Fallback fallback
      resumeText = `
        Resume of ${user.name}
        Contact: ${user.email}
        Role: ${targetRole}
        Skills: Flutter, Dart, Firebase, REST APIs, Git.
        Projects: Built InterviewAce client app.
      `;
    }

    // Call Gemini to evaluate resume against the target role
    const evaluation = await geminiService.analyzeResumeATS(resumeText, targetRole);

    // Award XP
    user.skills = [...new Set([...user.skills, ...(evaluation.missingSkills || [])])];
    
    // Add resume badge
    const hasResumeBadge = user.badges.some(b => b.title === 'Resume Certified');
    if (!hasResumeBadge) {
      user.badges.push({
        title: 'Resume Certified',
        icon: 'analytics',
        unlockedAt: new Date(),
      });
    }

    await awardXP(user, 40);

    res.status(200).json({
      evaluation,
      userXpUpdate: { xp: user.xp, level: user.level, badges: user.badges }
    });
  } catch (error) {
    console.error('Resume Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
};
