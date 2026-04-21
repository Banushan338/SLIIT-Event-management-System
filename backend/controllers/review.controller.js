const { Event } = require('../models/event.model');
const { Review } = require('../models/review.model');
const { Registration } = require('../models/registration.model');
const { Attendance } = require('../models/attendance.model');
const feedbackService = require('../services/feedback.service');
const { logger } = require('../utils/logger');

function isEventCompleted(event) {
  return feedbackService.isEventCompleted(event);
}

async function hasAttendance({ userId, userEmail, eventId }) {
  return feedbackService.userHasCheckInRecord(userId, userEmail, eventId);
}

async function assertReviewEligibility({ userId, userEmail, eventId }) {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    const err = new Error('Event not found');
    err.statusCode = 404;
    throw err;
  }
  if (!isEventCompleted(event)) {
    const err = new Error('Reviews are available only for completed events');
    err.statusCode = 400;
    throw err;
  }
  const registered = await Registration.findOne({ eventId, userId }).lean();
  if (registered) return;
  const attended = await hasAttendance({ userId, userEmail, eventId });
  if (!attended) {
    const err = new Error('Only registered or attended users can submit reviews');
    err.statusCode = 403;
    throw err;
  }
}

const submitReview = async (req, res) => {
  try {
    const { eventId, rating, reviewText = '' } = req.body || {};
    logger.info('submitReview request', { userId: req.user?.id, eventId });
    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required' });
    }

    const normalizedRating = Number.parseInt(rating, 10);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
    }
    const safeReviewText = feedbackService.sanitizeText(reviewText);
    if (safeReviewText.length > 2000) {
      return res.status(400).json({ message: 'reviewText is too long (max 2000 characters)' });
    }

    await assertReviewEligibility({
      userId: req.user.id,
      userEmail: req.user.email,
      eventId,
    });
    logger.info('submitReview eligibility passed', { userId: req.user?.id, eventId });

    const created = await Review.findOneAndUpdate(
      { eventId, userId: req.user.id },
      { $set: { rating: normalizedRating, reviewText: safeReviewText } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({
      message: 'Review saved',
      review: {
        id: created.id,
        eventId,
        userId: req.user.id,
        rating: created.rating,
        reviewText: created.reviewText,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      logger.warn('submitReview validation failed', { userId: req.user?.id, eventId: req.body?.eventId, message: error.message });
      return res.status(error.statusCode).json({ message: error.message });
    }
    logger.error('submitReview', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listReviewsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query?.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const event = await Event.findById(eventId).select('name date place').lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const [items, total, agg] = await Promise.all([
      Review.find({ eventId })
        .populate('userId', 'name email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ eventId }),
      Review.aggregate([
        { $match: { eventId: event._id } },
        {
          $group: {
            _id: '$eventId',
            averageRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
    const summary = agg[0] || { averageRating: null, count: 0 };

    const reviews = items.map((row) => ({
      id: row._id.toString(),
      userId: row.userId?._id?.toString?.() || null,
      eventId,
      rating: row.rating,
      reviewText: row.reviewText || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.userId
        ? {
            id: row.userId._id.toString(),
            name: row.userId.name,
            email: row.userId.email,
            profileImage: row.userId.profileImage || '',
          }
        : null,
    }));

    return res.status(200).json({
      event: {
        id: event._id.toString(),
        name: event.name,
        date: event.date,
        place: event.place,
      },
      summary: {
        averageRating: summary.averageRating == null ? null : Math.round(summary.averageRating * 100) / 100,
        count: summary.count,
      },
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error('listReviewsByEvent', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  submitReview,
  listReviewsByEvent,
};
