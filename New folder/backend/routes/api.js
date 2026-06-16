const express = require('express');
const multer = require('multer');

// Controllers
const userController = require('../controllers/userController');
const interviewController = require('../controllers/interviewController');
const resumeController = require('../controllers/resumeController');
const careerController = require('../controllers/careerController');
const coachController = require('../controllers/coachController');

const router = express.Router();

// File upload setup using memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit to 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed'), false);
    }
  }
});

// User routes
router.post('/users/auth', userController.loginOrRegister);
router.get('/users/:id', userController.getUserProfile);
router.put('/users/:id', userController.updateProfile);
router.get('/leaderboard', userController.getLeaderboard);

// Interview routes
router.post('/interviews/start', interviewController.startInterview);
router.post('/interviews/answer', interviewController.submitAnswer);
router.post('/interviews/complete', interviewController.completeInterview);
router.get('/interviews/history/:userId', interviewController.getInterviewHistory);

// Resume route
router.post('/resume/analyze', upload.single('resume'), resumeController.analyzeResume);

// Roadmap routes
router.post('/roadmap/generate', careerController.generateRoadmap);
router.get('/roadmap/:userId', careerController.getRoadmap);
router.post('/roadmap/milestone/toggle', careerController.toggleMilestone);

// AI Career Coach route
router.post('/coach/chat', coachController.sendMessage);

module.exports = router;
