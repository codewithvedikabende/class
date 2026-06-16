const Roadmap = require('../models/Roadmap');
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

exports.generateRoadmap = async (req, res) => {
  try {
    const { userId, dreamRole, currentSkills, timelineWeeks } = req.body;

    if (!userId || !dreamRole) {
      return res.status(400).json({ error: 'userId and dreamRole are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Call AI to generate structured roadmap
    const aiResponse = await geminiService.generateCareerRoadmap(
      dreamRole,
      currentSkills || user.skills.join(', '),
      timelineWeeks || 12
    );

    // Save roadmap in database
    const roadmap = new Roadmap({
      userId,
      role: aiResponse.role || dreamRole,
      timelineWeeks: aiResponse.timelineWeeks || timelineWeeks || 12,
      skills: aiResponse.skills || [],
      milestones: aiResponse.milestones || [],
    });

    await roadmap.save();

    // Award XP
    user.targetRole = dreamRole;
    const hasRoadmapBadge = user.badges.some(b => b.title === 'Roadmap Planner');
    if (!hasRoadmapBadge) {
      user.badges.push({
        title: 'Roadmap Planner',
        icon: 'map',
        unlockedAt: new Date(),
      });
    }

    await awardXP(user, 30);

    res.status(201).json({
      roadmap,
      userXpUpdate: { xp: user.xp, level: user.level, targetRole: user.targetRole }
    });
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate career roadmap' });
  }
};

exports.getRoadmap = async (req, res) => {
  try {
    const { userId } = req.params;
    const roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    if (!roadmap) {
      return res.status(404).json({ error: 'No roadmap found for this user' });
    }
    res.status(200).json(roadmap);
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch career roadmap' });
  }
};

exports.toggleMilestone = async (req, res) => {
  try {
    const { roadmapId, milestoneId } = req.body;

    if (!roadmapId || !milestoneId) {
      return res.status(400).json({ error: 'roadmapId and milestoneId are required' });
    }

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Find target milestone
    const milestone = roadmap.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Toggle
    milestone.completed = !milestone.completed;
    await roadmap.save();

    // If milestone was marked completed, award XP
    let userXpUpdate = null;
    if (milestone.completed) {
      const user = await User.findById(roadmap.userId);
      if (user) {
        await awardXP(user, 15);
        userXpUpdate = { xp: user.xp, level: user.level };
      }
    }

    res.status(200).json({ roadmap, userXpUpdate });
  } catch (error) {
    console.error('Error toggling milestone:', error);
    res.status(500).json({ error: 'Failed to toggle milestone status' });
  }
};
