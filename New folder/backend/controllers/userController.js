const User = require('../models/User');

exports.loginOrRegister = async (req, res) => {
  try {
    const { firebaseUid, email, name } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      // Create new user
      user = new User({
        firebaseUid,
        email,
        name: name || email.split('@')[0],
        skills: [],
        badges: [
          {
            title: 'Welcome Ace',
            icon: 'celebration',
            unlockedAt: new Date()
          }
        ]
      });
      await user.save();
    } else {
      // Check and update streak
      const today = new Date().toDateString();
      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : '';
      
      if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActive === yesterday.toDateString()) {
          user.streak += 1;
        } else {
          user.streak = 1; // reset streak if missed a day
        }
        user.lastActiveDate = new Date();
        await user.save();
      }
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Login/Register error:', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    // Return top 20 users sorted by level and XP
    const leaders = await User.find({})
      .sort({ level: -1, xp: -1 })
      .limit(20)
      .select('name currentRole level xp streak');
    res.status(200).json(leaders);
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, currentRole, targetRole, difficultyPreference, skills } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (currentRole) user.currentRole = currentRole;
    if (targetRole) user.targetRole = targetRole;
    if (difficultyPreference) user.difficultyPreference = difficultyPreference;
    if (skills) user.skills = skills;

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};
