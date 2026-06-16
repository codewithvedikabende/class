const User = require('../models/User');
const geminiService = require('../services/geminiService');

exports.sendMessage = async (req, res) => {
  try {
    const { userId, message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call Gemini Coach
    const responseText = await geminiService.chatCareerCoach(message, history || []);

    // Reward small XP if userId is provided
    let userXpUpdate = null;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Simple award of 5 XP for coaching session activity
        user.xp += 5;
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
        userXpUpdate = { xp: user.xp, level: user.level };
      }
    }

    res.status(200).json({
      text: responseText,
      sender: 'coach',
      createdAt: new Date(),
      userXpUpdate
    });
  } catch (error) {
    console.error('Error in AI Coach chat:', error);
    res.status(500).json({ error: 'Failed to process message with AI Coach' });
  }
};
