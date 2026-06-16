const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetRole: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate',
  },
  company: {
    type: String,
    default: 'General',
  },
  type: {
    type: String,
    enum: ['HR', 'Technical', 'Behavioral', 'Mixed'],
    default: 'Mixed',
  },
  questions: [
    {
      id: String,
      text: String,
      type: { type: String },
      difficulty: String,
      idealKeywords: [String],
      hints: String,
    }
  ],
  answers: [
    {
      questionId: String,
      answerText: String,
      speechAudioUrl: String,
      evaluation: {
        score: Number,
        strengths: [String],
        weaknesses: [String],
        suggestedAnswer: String,
        fillerWordCount: Number,
        pronunciationScore: Number,
        fluencyScore: Number,
        speakingSpeedWpm: Number,
        recommendation: String,
      }
    }
  ],
  overallEvaluation: {
    score: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    overallRecommendation: String,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Interview', InterviewSchema);
