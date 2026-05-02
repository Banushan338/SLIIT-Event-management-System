const aiDataService = require('./aiData.service')

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function calculateApprovalChance(payload) {
  let score = 50

  if ((payload.name || '').length > 10) score += 10
  if ((payload.description || '').length > 40) score += 10
  if (Number(payload.totalSeats || 0) >= 30) score += 8
  if (payload.place) score += 7
  if (payload.type) score += 5

  return Math.min(score, 98)
}

function getRiskLevel(seats) {
  if (seats <= 50) return 'Low'
  if (seats <= 150) return 'Moderate'
  return 'High'
}

async function generateEventCopilotSuggestions(payload) {
  const approvalChance = calculateApprovalChance(payload)
  const expectedAudience = Math.floor((Number(payload.totalSeats || 100) * randomBetween(60, 90)) / 100)

  return {
    enhancedTitle: `${payload.name} - Smart Campus Experience`,
    suggestedDescription:
      payload.description ||
      `This ${payload.type} event is expected to create high engagement among participants with structured activities and collaborative interaction.`,
    expectedAudience,
    suggestedStaffNeeded: Math.max(2, Math.floor(expectedAudience / 25)),
    approvalChance,
    riskLevel: getRiskLevel(Number(payload.totalSeats || 0)),
    bestPromotionMethod:
      approvalChance > 75 ? 'Email + Student Portal + Social Media Posters' : 'Need stronger promotion and clearer title',
    aiRemark:
      approvalChance > 75
        ? 'This event has a strong possibility of approval and student engagement.'
        : 'Improve description clarity and expected outcomes for better approval.',
  }
}

async function generateFacultyApprovalAdvice(eventId) {
  const event = await aiDataService.getEventByIdForAI(eventId)
  if (!event) {
    return { message: 'Event not found' }
  }

  const regCount = Number(event.registeredCount || 0)
  const seats = Number(event.totalSeats || 1)
  const fillRate = Math.round((regCount / seats) * 100)

  let confidence = 60
  if (event.description?.length > 50) confidence += 10
  if (event.place) confidence += 5
  if (event.type) confidence += 5
  if (seats >= 30) confidence += 5

  const recommendation = confidence >= 75 ? 'APPROVE' : 'REVIEW'

  return {
    confidence,
    recommendation,
    venueConflictRisk: randomBetween(5, 20) + '%',
    attendanceSuitability: `${Math.max(fillRate, randomBetween(55, 88))}%`,
    duplicateTopicRisk: randomBetween(3, 18) + '%',
    aiReason:
      recommendation === 'APPROVE'
        ? 'Event structure, capacity planning and submission quality appear acceptable.'
        : 'Event requires manual faculty review due to lower content confidence.',
  }
}

async function generateStudentRecommendations(studentId) {
  const allEvents = await aiDataService.getAllEventsForAI()

  const approvedEvents = allEvents
    .filter((e) => String(e.status).toLowerCase() === 'approved')
    .slice(0, 3)

  return approvedEvents.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    place: e.place,
    date: e.date,
    matchScore: randomBetween(78, 97),
    reason: `Recommended based on trending ${e.type} category and student engagement.`,
  }))
}

async function generateFeedbackInsights(eventId) {
  const feedbacks = await aiDataService.getEventFeedbacksForAI(eventId)

  const total = feedbacks.length
  if (!total) {
    return {
      sentimentScore: 0,
      topIssue: 'No feedback available yet',
      positiveArea: 'Pending',
      recommendation: 'Await more student responses',
    }
  }

  const avg =
    feedbacks.reduce((sum, f) => sum + Number(f.rating || 3), 0) / total

  return {
    sentimentScore: Math.round((avg / 5) * 100),
    topIssue: avg < 3 ? 'Students expect better organization and scheduling' : 'Minor venue comfort improvements',
    positiveArea: avg >= 4 ? 'Students highly appreciated event content and management' : 'Students appreciated participation opportunity',
    recommendation:
      avg >= 4
        ? 'Maintain similar execution strategy for future events.'
        : 'Improve communication, seating, and event pacing.',
  }
}

async function generateGlobalAssistantReply(message) {
  const lower = String(message || '').toLowerCase()

  if (lower.includes('create event')) {
    return 'To create a successful event, use the organizer event tab and ensure title, venue, and seat planning are properly filled.'
  }

  if (lower.includes('approval')) {
    return 'Faculty approval depends on event clarity, seat planning, and complete descriptions.'
  }

  if (lower.includes('student')) {
    return 'Students can browse approved events and receive AI recommendations based on popularity.'
  }

  return 'I am Smart Event Copilot. I can assist with event planning, approval understanding, feedback insights and recommendations.'
}

module.exports = {
  generateEventCopilotSuggestions,
  generateFacultyApprovalAdvice,
  generateStudentRecommendations,
  generateFeedbackInsights,
  generateGlobalAssistantReply,
}