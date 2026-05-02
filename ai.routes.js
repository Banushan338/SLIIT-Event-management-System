const express = require('express');
const router = express.Router();

const {
  eventCopilot,
  facultyAdvisor,
  studentRecommendations,
  feedbackInsights,
  chat,
} = require('../controllers/ai.controller');

router.post('/event-copilot', eventCopilot);
router.get('/faculty-advisor/:eventId', facultyAdvisor);
router.get('/student-recommendations', studentRecommendations);
router.get('/feedback-insights/:eventId', feedbackInsights);
router.post('/chat', chat);

module.exports = router;