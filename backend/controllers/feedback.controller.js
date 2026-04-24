/**
 * REST API for feedback (spec: /api/feedback/*).
 */
const { Feedback } = require('../models/feedback.model');
const { Event } = require('../models/event.model');
const feedbackService = require('../services/feedback.service');
const { normalizeRole } = require('../utils/rbac');
const { logger } = require('../utils/logger');

const submit = async (req, res) => {
  try {
    const { eventId, category, message = '', rating = null } = req.body || {};
    logger.info('submitFeedback request', { userId: req.user?.id, eventId, category });
    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required' });
    }

    const created = await feedbackService.submitFeedback({
      userId: req.user.id,
      userEmail: req.user.email,
      eventId,
      category,
      message,
      rating,
    });
    logger.info('submitFeedback success', { userId: req.user?.id, eventId, feedbackId: created.id });

    return res.status(201).json({
      message: 'Feedback submitted',
      feedback: created,
    });
  } catch (error) {
    if (error.statusCode) {
      logger.warn('submitFeedback validation failed', { userId: req.user?.id, eventId: req.body?.eventId, message: error.message });
      return res.status(error.statusCode).json({ message: error.message });
    }
    logger.error('submit feedback REST', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const role = normalizeRole(req.user?.role);
    if (!['admin', 'superAdmin', 'organizer'].includes(role)) {
      return res.status(403).json({ message: 'Only organizer or admin can view feedback entries' });
    }
    const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query?.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const event = await Event.findById(eventId).select('name date place').lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (role === 'organizer') {
      const own = await Event.findOne({ _id: eventId, createdBy: req.user.id }).select('_id').lean();
      if (!own) {
        return res.status(403).json({ message: 'Organizer can view feedback only for own events' });
      }
    }

    const [items, summary, total] = await Promise.all([
      Feedback.find({ eventId })
        .populate('userId', 'name email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      feedbackService.getEventFeedbackSummary(eventId),
      Feedback.countDocuments({ eventId }),
    ]);

    const feedbacks = items.map((row) => ({
      id: row._id.toString(),
      category: row.category,
      message: row.message ?? '',
      rating: row.rating,
      createdAt: row.createdAt,
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
        averageRating: summary.averageRating,
        count: summary.count,
      },
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error('getByEvent feedback', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMine = async (req, res) => {
  try {
    const rows = await Feedback.find({ userId: req.user.id })
      .populate('eventId', 'name date place')
      .sort({ createdAt: -1 })
      .lean();

    const feedbacks = rows.map((row) => ({
      id: row._id.toString(),
      category: row.category,
      message: row.message ?? '',
      rating: row.rating,
      createdAt: row.createdAt,
      event: row.eventId
        ? {
            id: row.eventId._id.toString(),
            name: row.eventId.name,
            date: row.eventId.date,
            place: row.eventId.place,
          }
        : null,
    }));

    return res.status(200).json({ feedbacks });
  } catch (error) {
    logger.error('getMine feedback', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Feedback.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    return res.status(200).json({ message: 'Feedback deleted' });
  } catch (error) {
    logger.error('delete feedback', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** Admin + organizer analytics */
const getAnalytics = async (req, res) => {
  try {
    const eventId = req.query.eventId;
    const [trends, topEvents] = await Promise.all([
      feedbackService.getFeedbackTrends(12),
      feedbackService.getMostLikedEvents(15),
    ]);

    let eventFilter = null;
    if (eventId) {
      const summary = await feedbackService.getEventFeedbackSummary(eventId);
      const ev = await Event.findById(eventId).select('name').lean();
      eventFilter = {
        eventId,
        name: ev?.name,
        ...summary,
      };
    }

    return res.status(200).json({
      trends,
      mostLikedEvents: topEvents,
      eventFilter,
    });
  } catch (error) {
    logger.error('feedback analytics', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  submit,
  getByEvent,
  getMine,
  remove,
  getAnalytics,
};
