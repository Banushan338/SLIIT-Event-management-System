const {
  generateOrganizerCopilot,
  generateFacultyAdvisor,
  generateStudentRecommendations,
  generateFeedbackInsights,
  generateChatReply,
} = require('../services/aiRecommendation.service');

async function eventCopilot(req, res) {
  try {
    const result = generateOrganizerCopilot(req.body || {});
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function facultyAdvisor(req, res) {
  try {
    const result = await generateFacultyAdvisor(req.params.eventId);
    return res.json(result || {});
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function studentRecommendations(req, res) {
  try {
    const result = await generateStudentRecommendations(req.user.id);
    return res.json({ recommendations: result || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function feedbackInsights(req, res) {
  try {
    const result = await generateFeedbackInsights(req.params.eventId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function chat(req, res) {
  try {
    const reply = generateChatReply(req.body.message || '');
    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  eventCopilot,
  facultyAdvisor,
  studentRecommendations,
  feedbackInsights,
  chat,
};