const { Event } = require('../models/event.model');
const { Registration } = require('../models/registration.model');
const { Feedback } = require('../models/feedback.model');
const feedbackService = require('../services/feedback.service');
const { logger } = require('../utils/logger');

const requireStudent = (req, res) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  return null;
};

const requireStudentOrStaff = (req, res) => {
  if (!['student', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Student or staff access required' });
  }
  return null;
};

const requireOrganizer = (req, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ message: 'Organizer access required' });
  }
  return null;
};

function isEventPast(event) {
  if (!event?.date || event.time == null) return false;
  const d = new Date(event.date);
  if (Number.isNaN(d.getTime())) return false;
  const parts = String(event.time).trim().split(':');
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1] ?? '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  d.setHours(h, m, 0, 0);
  return d.getTime() < Date.now();
}

const getStudentPastFeedbackItems = async (req, res) => {
  try {
    const deny = requireStudentOrStaff(req, res);
    if (deny) return;

    const regs = await Registration.find({ userId: req.user.id })
      .populate('eventId')
      .lean();

    const items = [];
    for (const r of regs) {
      const ev = r.eventId;
      if (!ev) continue;
      if (!isEventPast(ev)) continue;

      const fb = await Feedback.findOne({
        eventId: ev._id,
        userId: req.user.id,
      }).lean();

      items.push({
        event: {
          id: ev._id.toString(),
          name: ev.name,
          description: ev.description ?? '',
          type: ev.type,
          date: ev.date,
          time: ev.time,
          place: ev.place,
          thumbnailUrl: ev.thumbnailUrl ?? '',
          status: ev.status,
        },
        feedback: fb
          ? {
              id: fb._id.toString(),
              category: fb.category,
              rating: fb.rating,
              message: fb.message ?? '',
              comment: fb.message ?? '',
              createdAt: fb.createdAt,
              updatedAt: fb.updatedAt,
            }
          : null,
      });
    }

    items.sort((a, b) => {
      const ta = new Date(a.event.date).getTime();
      const tb = new Date(b.event.date).getTime();
      return tb - ta;
    });

    return res.status(200).json({ items });
  } catch (error) {
    logger.error('Error listing past feedback items for student', {
      message: error.message,
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const submitFeedback = async (req, res) => {
  try {
    const deny = requireStudent(req, res);
    if (deny) return;

    const eventId = req.params?.id;
    const { rating = null, category = 'Other', message = '' } = req.body || {};

    const created = await feedbackService.submitFeedback({
      userId: req.user.id,
      userEmail: req.user.email,
      eventId,
      category,
      message,
      rating,
    });

    return res.status(201).json({
      message: 'Feedback submitted',
      feedback: {
        id: created.id,
        category: created.category,
        rating: created.rating,
        message: created.message,
        comment: created.message,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    logger.error('Error submitting feedback', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listOrganizerFeedbacks = async (req, res) => {
  try {
    const deny = requireOrganizer(req, res);
    if (deny) return;

    const myEvents = await Event.find({ createdBy: req.user.id })
      .select('_id name date')
      .lean();
    const eventIds = myEvents.map((e) => e._id);
    const nameById = new Map(
      myEvents.map((e) => [e._id.toString(), e.name])
    );

    if (eventIds.length === 0) {
      return res.status(200).json({ feedbacks: [] });
    }

    const rows = await Feedback.find({ eventId: { $in: eventIds } })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const feedbacks = rows.map((row) => ({
      id: row._id.toString(),
      eventId: row.eventId.toString(),
      eventName: nameById.get(row.eventId.toString()) ?? 'Event',
      category: row.category,
      rating: row.rating,
      message: row.message ?? '',
      comment: row.message ?? '',
      createdAt: row.createdAt,
      student: row.userId
        ? {
            id: row.userId._id.toString(),
            name: row.userId.name,
            email: row.userId.email,
          }
        : null,
    }));

    return res.status(200).json({ feedbacks });
  } catch (error) {
    logger.error('Error listing organizer feedbacks', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getStudentPastFeedbackItems,
  submitFeedback,
  listOrganizerFeedbacks,
  isEventPast,
};
