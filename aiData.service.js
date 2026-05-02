const { Event } = require('../models/event.model')
const { Feedback } = require('../models/feedback.model')

async function getAllEventsForAI() {
  return await Event.find({}).lean()
}

async function getEventByIdForAI(eventId) {
  return await Event.findById(eventId).lean()
}

async function getEventFeedbacksForAI(eventId) {
  return await Feedback.find({ eventId }).lean()
}

module.exports = {
  getAllEventsForAI,
  getEventByIdForAI,
  getEventFeedbacksForAI,
}