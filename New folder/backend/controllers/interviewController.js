const Interview = require('../models/Interview');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

// Helper to award XP and check for level ups
async function awardXP(user, xpAmount) {
  user.xp += xpAmount;
  const targetXp = user.level * 100; // Simplistic level system: level 1 needs 100 XP, 2 needs 200 XP, etc.
  if (user.xp >= targetXp) {
    user.xp -= targetXp;
    user.level += 1;
    user.badges.push({
      title: `Level ${user.level} Climber`,
      icon: 'military_tech',
      unlockedAt: new Date(),
    });
  }
  
  // Update daily streak
  const today = new Date().toDateString();
  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : '';
  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastActive === yesterday.toDateString()) {
      user.streak += 1;
    } else {
      user.streak = 1; // reset if missed a day
    }
    user.lastActiveDate = new Date();
  }

  await user.save();
}

exports.startInterview = async (req, res) => {
  try {
    const { userId, targetRole, difficulty, company, type } = req.body;
    
    if (!userId || !targetRole) {
      return res.status(400).json({ error: 'userId and targetRole are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate questions using Gemini Service
    const aiResponse = await geminiService.generateInterviewQuestions(
      targetRole, 
      difficulty || 'Intermediate', 
      company || 'General',
      [] // history empty on start
    );

    const interview = new Interview({
      userId,
      targetRole,
      difficulty: difficulty || 'Intermediate',
      company: company || 'General',
      type: type || 'Mixed',
      questions: aiResponse.questions || [],
      answers: [],
    });

    await interview.save();
    res.status(201).json(interview);
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to initialize mock interview' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionId, answerText, mode } = req.body;
    
    if (!interviewId || !questionId || !answerText) {
      return res.status(400).json({ error: 'interviewId, questionId and answerText are required' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const question = interview.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in this interview session' });
    }

    // Evaluate answer via Gemini
    const evaluation = await geminiService.evaluateSingleAnswer(
      question.text,
      answerText,
      mode || 'text'
    );

    // Save answer & evaluation
    interview.answers.push({
      questionId,
      answerText,
      evaluation,
    });

    await interview.save();
    res.status(200).json({ interview, evaluation });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
};

exports.completeInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;
    
    if (!interviewId) {
      return res.status(400).json({ error: 'interviewId is required' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (interview.completed) {
      return res.status(400).json({ error: 'Interview already completed', interview });
    }

    // Calculate overall evaluation
    let totalScore = 0;
    const allStrengths = [];
    const allWeaknesses = [];
    
    interview.answers.forEach(ans => {
      totalScore += ans.evaluation.score || 0;
      if (ans.evaluation.strengths) allStrengths.push(...ans.evaluation.strengths);
      if (ans.evaluation.weaknesses) allWeaknesses.push(...ans.evaluation.weaknesses);
    });

    const averageScore = interview.answers.length > 0 ? Math.round(totalScore / interview.answers.length) : 0;
    
    // Deduplicate and filter lists
    const uniqueStrengths = [...new Set(allStrengths)].slice(0, 3);
    const uniqueWeaknesses = [...new Set(allWeaknesses)].slice(0, 3);

    interview.overallEvaluation = {
      score: averageScore,
      strengths: uniqueStrengths,
      weaknesses: uniqueWeaknesses,
      overallRecommendation: `Great effort! Your average score is ${averageScore}%. Focus on refining target topics like: ${uniqueWeaknesses.join(', ')}.`,
    };
    interview.completed = true;

    await interview.save();

    // Reward XP to User
    const user = await User.findById(interview.userId);
    if (user) {
      user.completedInterviewsCount += 1;
      let xpEarned = 50; // base completion XP
      if (averageScore >= 80) {
        xpEarned += 30; // bonus for great score
        user.badges.push({
          title: 'Honor Graduate',
          icon: 'workspace_premium',
          unlockedAt: new Date(),
        });
      }
      
      // Award first interview badge
      if (user.completedInterviewsCount === 1) {
        user.badges.push({
          title: 'First Mock Complete',
          icon: 'sports_esports',
          unlockedAt: new Date(),
        });
      }

      await awardXP(user, xpEarned);
    }

    res.status(200).json({ interview, userXpUpdate: user ? { xp: user.xp, level: user.level } : null });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: 'Failed to complete interview session' });
  }
};

exports.getInterviewHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(interviews);
  } catch (error) {
    console.error('Error fetching interview history:', error);
    res.status(500).json({ error: 'Failed to fetch interview history' });
  }
};
