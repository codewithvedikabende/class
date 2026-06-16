const mongoose = require('mongoose');

const RoadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  timelineWeeks: {
    type: Number,
    default: 12,
  },
  skills: [String],
  milestones: [
    {
      week: String,
      title: String,
      topics: [String],
      projects: [String],
      certifications: [String],
      completed: {
        type: Boolean,
        default: false,
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Roadmap', RoadmapSchema);
