const natural = require('natural');
const { Event } = require('../models/event.model');
const { Feedback } = require('../models/feedback.model');
const { Registration } = require('../models/registration.model');

function scoreEventQuality({ name, description, totalSeats, type, place }) {
  let score = 55;

  if ((name || '').length > 8) score += 8;
  if ((description || '').length > 30) score += 10;
  if (Number(totalSeats) >= 30) score += 8;
  if (place) score += 6;
  if (['academic', 'work', 'sports', 'social'].includes(String(type))) score += 8;

  if ((description || '').toLowerCase().includes('workshop')) score += 5;
  if ((description || '').toLowerCase().includes('seminar')) score += 5;
  if ((description || '').toLowerCase().includes('competition')) score += 5;

  return Math.min(score, 98);
}

function generateOrganizerCopilot(form = {}) {
  const approvalScore = scoreEventQuality(form);

  let suggestion = 'Looks acceptable.';
  if (approvalScore < 70) suggestion = 'Add more event details to increase approval confidence.';
  if (!form.place) suggestion = 'Venue selection is missing.';
  if (!form.description || form.description.length < 20) suggestion = 'Description is too short.';
  if (!form.totalSeats || Number(form.totalSeats) < 20) suggestion = 'Seat count seems too low.';

  return {
    approvalScore,
    suggestion,
    recommendedAudience:
      form.type === 'academic'
        ? 'Students interested in academic growth'
        : form.type === 'sports'
        ? 'Sports enthusiasts'
        : form.type === 'social'
        ? 'General campus audience'
        : 'Workshop participants',
    riskLevel: approvalScore >= 75 ? 'Low' : 'Medium',
  };
}

async function generateFacultyAdvisor(eventId) {
  const event = await Event.findById(eventId).lean();
  if (!event) return null;

  const confidence = scoreEventQuality(event);

  const duplicateEvents = await Event.countDocuments({
    _id: { $ne: event._id },
    type: event.type,
    date: event.date,
  });

  return {
    confidence,
    venueConflict: duplicateEvents > 0 ? 'Possible venue/date overlap detected' : 'No major venue conflict',
    duplicateRisk: duplicateEvents > 1 ? 'Similar event already scheduled' : 'Low duplicate risk',
    recommendation: confidence >= 75 ? 'Recommended for approval' : 'Needs manual review',
  };
}

async function generateStudentRecommendations(userId) {
  const regs = await Registration.find({ userId }).lean();
  const regIds = regs.map((r) => r.eventId);

  const pastEvents = await Event.find({ _id: { $in: regIds } }).lean();

  const preferredTypes = {};
  for (const ev of pastEvents) {
    preferredTypes[ev.type] = (preferredTypes[ev.type] || 0) + 1;
  }

  const topType =
    Object.keys(preferredTypes).sort((a, b) => preferredTypes[b] - preferredTypes[a])[0] || 'academic';

  const recommendations = await Event.find({
    type: topType,
    status: 'approved',
    _id: { $nin: regIds },
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  return recommendations;
}

async function generateFeedbackInsights(eventId) {
  const feedbacks = await Feedback.find({ eventId }).lean();
  if (!feedbacks.length) {
    return {
      sentimentScore: 0,
      topIssue: 'No feedback yet',
      positiveArea: 'No feedback yet',
      recommendation: 'Wait for student responses',
    };
  }

  let positive = 0;
  let negative = 0;
  let venueIssue = 0;
  let contentPraise = 0;

  feedbacks.forEach((f) => {
    const txt = `${f.message || ''} ${f.comment || ''}`;
    const analysis = natural.SentimentAnalyzer;
    const tokenizer = new natural.WordTokenizer();
    const analyzer = new analysis('English', natural.PorterStemmer, 'afinn');
    const score = analyzer.getSentiment(tokenizer.tokenize(txt));

    if (score >= 0) positive++;
    else negative++;

    if (txt.toLowerCase().includes('venue')) venueIssue++;
    if (txt.toLowerCase().includes('content')) contentPraise++;
  });

  const sentimentScore = Math.round((positive / feedbacks.length) * 100);

  return {
    sentimentScore,
    topIssue: venueIssue > 0 ? 'Venue arrangements' : 'Minor logistical concerns',
    positiveArea: contentPraise > 0 ? 'Event content quality' : 'Student participation',
    recommendation: sentimentScore >= 70 ? 'Maintain current standards' : 'Improve logistics and engagement',
  };
}

function generateChatReply(message = '') {
  const msg = String(message).toLowerCase().trim();

  // ---------------- GREETINGS ----------------
  if (['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon'].some((g) => msg.includes(g))) {
    return 'Hello 👋 I am Smart Event Copilot. I can help you with event planning, approval guidance, venue suggestions, student engagement ideas, and feedback intelligence.';
  }

  if (msg.includes('who are you') || msg.includes('what can you do')) {
    return 'I am an AI-powered Smart Event Copilot integrated into the Event Management System to assist organizers, faculty coordinators, and students with intelligent event-related recommendations.';
  }

  // ---------------- APPROVAL / REJECTION ----------------
  if (msg.includes('approval') || msg.includes('approve') || msg.includes('rejected') || msg.includes('reject')) {
    return 'Faculty approvals mainly depend on event clarity, venue availability, participant relevance, realistic seat allocation, departmental suitability, and whether the event duplicates another submission. Improving these areas significantly increases approval probability.';
  }

  if (msg.includes('why rejected') || msg.includes('rejection reason')) {
    return 'Common rejection reasons include incomplete event descriptions, unrealistic venue selection, low academic or student value, scheduling conflicts, and duplicate event concepts already in the system.';
  }

  // ---------------- FEEDBACK ----------------
  if (msg.includes('feedback') || msg.includes('review') || msg.includes('student opinion')) {
    return 'AI feedback analysis helps identify repeated student complaints, satisfaction patterns, logistical weaknesses, and content strengths. This allows organizers to make data-driven improvements for future events.';
  }

  // ---------------- REGISTRATION / ATTENDANCE ----------------
  if (msg.includes('registration') || msg.includes('more students') || msg.includes('attract students') || msg.includes('increase participants')) {
    return 'Student registrations increase when events provide certificates, career relevance, competitions, hands-on sessions, networking opportunities, giveaways, or visible academic benefits. Strong promotional wording also matters.';
  }

  if (msg.includes('attendance')) {
    return 'Attendance rates improve when reminder notifications, practical benefits, certificates, engaging speakers, and well-chosen timings are used together.';
  }

  // ---------------- VENUE ----------------
  if (msg.includes('venue') || msg.includes('location') || msg.includes('place') || msg.includes('hall')) {
    return 'Venue selection should align with expected attendance, available equipment, accessibility, and event format. Venue mismatch is one of the common hidden approval risks.';
  }

  if (msg.includes('auditorium')) {
    return 'Auditorium is ideal for keynote seminars, guest lectures, technical conferences, and formal student assemblies because it supports larger audiences and multimedia presentations.';
  }

  if (msg.includes('ground')) {
    return 'Main ground is best suited for sports tournaments, charity runs, outdoor festivals, music events, and large-scale social competitions.';
  }

  if (msg.includes('main hall')) {
    return 'Main hall is a flexible venue suitable for workshops, award ceremonies, club meetings, mini conferences, and moderate audience seminars.';
  }

  // ---------------- TIME BASED ----------------
  if (msg.includes('10 am') || msg.includes('morning event')) {
    return 'Morning sessions around 10 AM are highly suitable for academic seminars, technical workshops, guest lectures, and focused student learning activities.';
  }

  if (msg.includes('afternoon')) {
    return 'Afternoon sessions are effective for practical workshops, student presentations, networking sessions, and faculty interactive programs.';
  }

  if (msg.includes('evening')) {
    return 'Evening hours are ideal for social gatherings, cultural performances, entertainment events, and relaxed networking activities.';
  }

  // ---------------- EVENT CATEGORY IDEAS ----------------
  if (msg.includes('seminar ideas') || msg.includes('suggest seminar')) {
    return 'Strong seminar ideas include AI Innovation Seminar, Career Readiness Seminar, Cybersecurity Awareness Session, Entrepreneurship Forum, and Research Publication Workshop.';
  }

  if (msg.includes('workshop ideas') || msg.includes('suggest workshop')) {
    return 'Recommended workshop ideas are UI/UX Bootcamp, CV Building Workshop, Public Speaking Training, Cloud Computing Hands-on Lab, and Startup Pitch Development Workshop.';
  }

  if (msg.includes('sports event') || msg.includes('sports ideas')) {
    return 'Popular sports event ideas include Interfaculty Cricket Tournament, Indoor Chess Challenge, Badminton Knockout, Fitness Marathon, and E-sports Championship.';
  }

  if (msg.includes('social event') || msg.includes('fun event')) {
    return 'Good social event ideas are Talent Night, Music Fiesta, Food Carnival, Photography Walk, Cultural Day, and Team Treasure Hunt.';
  }

  // ---------------- EVENT NAME SPECIFIC ----------------
  if (msg.includes('ai seminar')) {
    return 'AI seminars perform best when they include emerging technology trends, practical demonstrations, student research showcases, and guest speakers from the software industry.';
  }

  if (msg.includes('career workshop')) {
    return 'Career workshops attract strong participation when they include CV reviews, LinkedIn optimization, interview preparation, internship awareness, and HR expert guidance.';
  }

  if (msg.includes('cyber security')) {
    return 'Cyber Security themed events are highly engaging when they include live hacking demos, password safety awareness, phishing simulations, and ethical hacking introductions.';
  }

  // ---------------- FACULTY / RECOMMENDATION ----------------
  if (msg.includes('faculty')) {
    return 'Faculty coordinators generally evaluate academic value, scheduling practicality, department relevance, event uniqueness, and expected student benefit before approving an event.';
  }

  if (msg.includes('recommend') || msg.includes('student recommendation') || msg.includes('suggest events')) {
    return 'The AI recommendation engine studies previous registrations, preferred event categories, and attendance behavior to suggest the most suitable upcoming events for each student.';
  }

  // ---------------- EVENT PLANNING ----------------
  if (msg.includes('event plan') || msg.includes('planning') || msg.includes('organize event') || msg.includes('create event')) {
    return 'Strong event planning requires a meaningful title, detailed agenda, proper venue, suitable timing, realistic audience targeting, and measurable student engagement outcomes. Detailed planning improves both approval and attendance.';
  }

  if (msg.includes('best category') || msg.includes('popular category')) {
    return 'Based on campus engagement trends, academic workshops, career seminars, technology bootcamps, and competitive social events generally attract the highest student participation.';
  }

  if (msg.includes('promotion') || msg.includes('advertise') || msg.includes('marketing')) {
    return 'Event promotion performs best when early announcements, poster visibility, email reminders, social media teasers, and benefit-focused descriptions are used together.';
  }

  if (msg.includes('successful event')) {
    return 'A successful event is one that achieves high approval confidence, strong registration turnout, active attendance, and positive student sentiment after completion.';
  }

  if (msg.includes('ai feature') || msg.includes('artificial intelligence')) {
    return 'This platform uses AI-powered advisory modules for event approval prediction, faculty decision support, student recommendation intelligence, smart chatbot interaction, and automated feedback interpretation.';
  }

  // ---------------- DEFAULT ----------------
  return 'I can help with event approvals, planning strategy, venue decisions, student registrations, attendance improvement, AI recommendations, and feedback intelligence.';
}

module.exports = {
  generateOrganizerCopilot,
  generateFacultyAdvisor,
  generateStudentRecommendations,
  generateFeedbackInsights,
  generateChatReply,
};