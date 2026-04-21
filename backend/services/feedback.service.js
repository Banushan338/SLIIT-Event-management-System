/**
 * Shared feedback business logic (REST + legacy event routes).
 */
const { Event } = require('../models/event.model');
const { Registration } = require('../models/registration.model');
const { Attendance } = require('../models/attendance.model');
const { Feedback } = require('../models/feedback.model');
const mongoose = require('mongoose');

function isEventPast(event) {
  const endMs = getEventEndTimestamp(event);
  if (!Number.isFinite(endMs)) return false;
  return Date.now() > endMs;
}

function parseClockTo24h(timeInput) {
  const raw = String(timeInput || '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return null;
  let hour = Number.parseInt(m[1], 10);
  const minute = Number.parseInt(m[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  const meridian = String(m[3] || '').toUpperCase();
  if (meridian === 'AM') {
    if (hour === 12) hour = 0;
  } else if (meridian === 'PM') {
    if (hour < 12) hour += 12;
  }
  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

function getEventEndTimestamp(event) {
  const directEnd = new Date(event?.endTime).getTime();
  if (Number.isFinite(directEnd)) return directEnd;

  const start = new Date(event?.startTime || event?.date).getTime();
  if (!Number.isFinite(start)) return NaN;

  const duration = Number.parseInt(event?.durationMinutes, 10);
  if (Number.isFinite(duration) && duration > 0) {
    return start + duration * 60000;
  }

  const parsed = parseClockTo24h(event?.time);
  if (parsed) {
    const d = new Date(event?.date || event?.startTime);
    if (Number.isFinite(d.getTime())) {
      d.setHours(parsed.hour, parsed.minute, 0, 0);
      return d.getTime();
    }
  }
  return start;
}

function isEventCompleted(event) {
  const status = String(event?.status || '').toLowerCase();
  if (status === 'completed') return true;
  const endMs = getEventEndTimestamp(event);
  return Number.isFinite(endMs) && Date.now() > endMs;
}

/**
 * Optional strict "attendance": QR scan stored rawQr JSON includes user id/email.
 */
async function userHasCheckInRecord(userId, userEmail, eventId) {
  const rows = await Attendance.find({ eventId }).select('rawQr').lean();
  const uid = String(userId);
  const em = String(userEmail || '').toLowerCase();
  for (const row of rows) {
    try {
      const p = JSON.parse(row.rawQr);
      if (String(p.u) === uid || String(p.u).toLowerCase() === em) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

async function assertCanSubmitFeedback({ userId, userEmail, eventId }) {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    const err = new Error('Event not found');
    err.statusCode = 404;
    throw err;
  }

  const reg = await Registration.findOne({
    eventId: event._id,
    userId,
  }).lean();
  const attended = await userHasCheckInRecord(userId, userEmail, event._id);
  if (!reg && !attended) {
    const err = new Error('You must register for this event');
    err.statusCode = 403;
    throw err;
  }

  if (!isEventCompleted(event)) {
    const err = new Error('Feedback is available only after event completion');
    err.statusCode = 400;
    throw err;
  }

  const requireCheckIn = process.env.FEEDBACK_REQUIRE_CHECKIN === 'true';
  if (requireCheckIn) {
    const ok = await userHasCheckInRecord(userId, userEmail, event._id);
    if (!ok) {
      const err = new Error('You must attend (check in) before leaving feedback');
      err.statusCode = 403;
      throw err;
    }
  }

  return { event, registered: Boolean(reg), attended: Boolean(attended) };
}

function sanitizeText(text) {
  return String(text || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

async function submitFeedback({ userId, userEmail, eventId, category, message, rating }) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const err = new Error('Invalid event id');
    err.statusCode = 400;
    throw err;
  }

  const safeCategory = String(category || 'Other').trim();
  if (!['Organization', 'Content', 'Venue', 'Other'].includes(safeCategory)) {
    const err = new Error('category must be one of Organization, Content, Venue, Other');
    err.statusCode = 400;
    throw err;
  }

  const safeMessage = sanitizeText(message);
  if (!safeMessage) {
    const err = new Error('message is required');
    err.statusCode = 400;
    throw err;
  }
  if (safeMessage.length > 2000) {
    const err = new Error('message is too long (max 2000 characters)');
    err.statusCode = 400;
    throw err;
  }

  let normalizedRating = null;
  if (rating != null && String(rating) !== '') {
    const rNum = Number.parseInt(rating, 10);
    if (!Number.isFinite(rNum) || rNum < 1 || rNum > 5) {
      const err = new Error('rating must be an integer between 1 and 5');
      err.statusCode = 400;
      throw err;
    }
    normalizedRating = rNum;
  }

  await assertCanSubmitFeedback({ userId, userEmail, eventId });

  const saved = await Feedback.create(
    {
      eventId,
      userId,
      category: safeCategory,
      message: safeMessage,
      rating: normalizedRating,
    },
  );

  return {
    id: saved._id.toString(),
    category: saved.category,
    message: saved.message,
    rating: saved.rating,
    createdAt: saved.createdAt,
  };
}

/** Average rating and count per event + optional filter */
async function getEventFeedbackSummary(eventId) {
  const id = new mongoose.Types.ObjectId(String(eventId));
  const agg = await Feedback.aggregate([
    { $match: { eventId: id } },
    {
      $group: {
        _id: '$eventId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const row = agg[0];
  if (!row) {
    return { averageRating: null, count: 0 };
  }
  return {
    averageRating: Math.round(row.avgRating * 100) / 100,
    count: row.count,
  };
}

async function listFeedbackByEvent(eventId) {
  return Feedback.find({ eventId })
    .populate('userId', 'name email profileImage')
    .sort({ createdAt: -1 })
    .lean();
}

/** Top events by average rating (min 1 review). */
async function getMostLikedEvents(limit = 10) {
  return Feedback.aggregate([
    {
      $group: {
        _id: '$eventId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 1 } } },
    { $sort: { avgRating: -1, count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: Event.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'event',
      },
    },
    { $unwind: '$event' },
    {
      $project: {
        eventId: '$_id',
        name: '$event.name',
        averageRating: { $round: ['$avgRating', 2] },
        feedbackCount: '$count',
      },
    },
  ]);
}

/** Monthly feedback counts (trends). */
async function getFeedbackTrends(monthsBack = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  return Feedback.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', count: 1 } },
  ]);
}

module.exports = {
  isEventPast,
  isEventCompleted,
  getEventEndTimestamp,
  submitFeedback,
  getEventFeedbackSummary,
  listFeedbackByEvent,
  getMostLikedEvents,
  getFeedbackTrends,
  userHasCheckInRecord,
  sanitizeText,
};
