const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const { Event } = require('../models/event.model');
const { Registration } = require('../models/registration.model');
const { Attendance } = require('../models/attendance.model');
const { Feedback } = require('../models/feedback.model');
const { logger } = require('../utils/logger');
const feedbackService = require('../services/feedback.service');
const { combineDateAndTime, deriveLifecycleStatus } = require('../utils/eventLifecycle');
const { normalizeRole } = require('../utils/rbac');
const { EVENT_ACTIVE } = require('../utils/eventQueries');

function requireAdminOrSuper(req, res) {
  const r = normalizeRole(req.user?.role);
  if (!['admin', 'superAdmin'].includes(r)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return null;
}

const softDeleteEventByAdmin = async (req, res) => {
  try {
    if (requireAdminOrSuper(req, res)) return;
    const eventId = req.params?.id;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const event = await Event.findById(eventId);
    if (!event || event.deletedAt) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.deletedAt = new Date();
    event.deletedBy = req.user.id;
    await event.save();
    return res.status(200).json({ message: 'Event moved to Recycle Bin', id: String(event._id) });
  } catch (error) {
    logger.error('softDeleteEventByAdmin', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listRecycledEvents = async (req, res) => {
  try {
    if (requireAdminOrSuper(req, res)) return;
    const items = await Event.find({ deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .populate('createdBy', 'name email')
      .lean();
    return res.status(200).json({
      events: items.map((e) => ({
        id: e._id.toString(),
        name: e.name,
        deletedAt: e.deletedAt,
        status: e.status,
        createdBy: e.createdBy ? { name: e.createdBy.name, email: e.createdBy.email } : null,
      })),
    });
  } catch (error) {
    logger.error('listRecycledEvents', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const restoreRecycledEvent = async (req, res) => {
  try {
    if (requireAdminOrSuper(req, res)) return;
    const eventId = req.params?.id;
    const event = await Event.findById(eventId);
    if (!event || !event.deletedAt) {
      return res.status(404).json({ message: 'Trashed event not found' });
    }
    event.deletedAt = null;
    event.deletedBy = null;
    await event.save();
    return res.status(200).json({ message: 'Event restored' });
  } catch (error) {
    logger.error('restoreRecycledEvent', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const permanentlyDeleteEvent = async (req, res) => {
  try {
    if (requireAdminOrSuper(req, res)) return;
    const eventId = req.params?.id;
    const event = await Event.findById(eventId);
    if (!event || !event.deletedAt) {
      return res.status(404).json({ message: 'Trashed event not found' });
    }
    await Event.deleteOne({ _id: event._id });
    return res.status(200).json({ message: 'Event permanently deleted' });
  } catch (error) {
    logger.error('permanentlyDeleteEvent', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

function buildSimulationPayload(body) {
  const totalSeats = Math.max(1, Number.parseInt(body?.totalSeats, 10) || 200);
  const expected = Math.max(1, Number.parseInt(body?.expectedAttendance, 10) || Math.floor(totalSeats * 0.75));
  const durationMins = Math.max(30, Number.parseInt(body?.durationMinutes, 10) || 120);
  const step = 15;
  const steps = Math.min(12, Math.ceil(durationMins / step));
  const expectedCrowdFlow = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1 || 1);
    const phase = t < 0.2 ? t / 0.2 : t > 0.75 ? (1 - t) / 0.25 : 1;
    const flow = 0.15 + 0.85 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * phase;
    expectedCrowdFlow.push({
      timeLabel: `+${i * step} min`,
      minutesFromStart: i * step,
      relativeIntensity: Math.round(flow * 100) / 100,
      estPresent: Math.min(totalSeats, Math.round(expected * flow)),
    });
  }
  const peak = [...expectedCrowdFlow].sort((a, b) => b.estPresent - a.estPresent)[0];
  return {
    expectedCrowdFlow,
    peakBusySlots: expectedCrowdFlow
      .filter((x) => x.relativeIntensity >= 0.65)
      .map((x) => x.timeLabel),
    peakTimeSlot: peak ? `${peak.timeLabel} (≈ ${peak.estPresent} people)` : 'n/a',
    estimatedResourceUsage: {
      seatCapacity: totalSeats,
      expectedAttendance: expected,
      estPeakConcurrent: peak?.estPresent || expected,
      estStaffAtPeak: Math.max(2, Math.ceil((peak?.estPresent || expected) / 50)),
    },
  };
}

const previewEventSimulation = async (req, res) => {
  try {
    return res.status(200).json({ simulation: buildSimulationPayload(req.body || {}) });
  } catch (error) {
    logger.error('previewEventSimulation', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getResourceInsights = async (req, res) => {
  try {
    const eventId = req.params?.id;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const event = await Event.findOne({ _id: eventId, ...EVENT_ACTIVE }).lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const role = normalizeRole(req.user?.role);
    if (role === 'organizer' && String(event.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only view insights for your own events' });
    }
    if (!['admin', 'superAdmin', 'organizer', 'facultyCoordinator'].includes(role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const [regCount, scanCount] = await Promise.all([
      Registration.countDocuments({ eventId: event._id }),
      Attendance.countDocuments({ eventId: event._id }),
    ]);
    const seats = event.totalSeats || 0;
    const unusedSeats = Math.max(0, seats - regCount);
    const attendanceRate = regCount > 0 ? Math.round((Math.min(regCount, scanCount) / regCount) * 100) : 0;
    const noShow = Math.max(0, regCount - scanCount);
    const wasteScore = Math.min(
      100,
      Math.round((unusedSeats / Math.max(1, seats)) * 40 + (regCount > 0 ? (noShow / regCount) * 60 : 0)),
    );
    const efficiency =
      seats <= 0
        ? 0
        : Math.max(
            0,
            Math.min(100, Math.round((Math.min(seats, regCount) / seats) * 100 * 0.7 + attendanceRate * 0.3)),
          );
    return res.status(200).json({
      eventId: String(event._id),
      name: event.name,
      totalSeats: seats,
      registrations: regCount,
      checkInScans: scanCount,
      unusedSeats,
      noShowRegistrations: noShow,
      wasteScore,
      utilizationEfficiencyPct: efficiency,
      insights: [
        unusedSeats > seats * 0.25
          ? 'Consider reducing advertised capacity or targeted promotion to reduce empty capacity.'
          : 'Seat fill looks healthy relative to published capacity.',
        noShow > regCount * 0.2 && regCount > 0
          ? 'Notable no-shows: send reminders and consider waitlists for future runs.'
          : 'Attendance follow-through is in a normal range.',
      ],
    });
  } catch (error) {
    logger.error('getResourceInsights', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getResourceAnalytics = async (req, res) => {
  try {
    if (requireAdminOrSuper(req, res)) return;
    const events = await Event.find({ ...EVENT_ACTIVE }).select('name totalSeats').sort({ createdAt: -1 }).lean();
    const capped = events.slice(0, 40);
    const ids = capped.map((e) => e._id);
    const [regAgg, scanAgg] = await Promise.all([
      Registration.aggregate([
        { $match: { eventId: { $in: ids } } },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { eventId: { $in: ids } } },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
      ]),
    ]);

    const regsById = new Map(regAgg.map((x) => [String(x._id), x.count]));
    const scansById = new Map(scanAgg.map((x) => [String(x._id), x.count]));
    const byEvent = capped.map((e) => {
      const eventId = String(e._id);
      const totalSeats = Math.max(0, Number(e.totalSeats || 0));
      const registrations = Math.max(0, Number(regsById.get(eventId) || 0));
      const checkInScans = Math.max(0, Number(scansById.get(eventId) || 0));
      const unusedSeats = Math.max(0, totalSeats - registrations);
      const wastedCapacityPct = totalSeats > 0 ? Math.round((unusedSeats / totalSeats) * 100) : 0;
      const utilizationEfficiencyScore =
        totalSeats <= 0
          ? 0
          : Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (Math.min(totalSeats, registrations) / totalSeats) * 70 +
                    (Math.min(registrations, checkInScans) / Math.max(1, registrations)) * 30,
                ),
              ),
            );
      return {
        eventId,
        eventName: e.name,
        totalSeats,
        registrations,
        checkInScans,
        unusedSeats,
        wastedCapacityPct,
        utilizationEfficiencyScore,
      };
    });

    return res.status(200).json({
      byEvent,
      totals: {
        totalSeats: byEvent.reduce((sum, x) => sum + x.totalSeats, 0),
        registrations: byEvent.reduce((sum, x) => sum + x.registrations, 0),
        unusedSeats: byEvent.reduce((sum, x) => sum + x.unusedSeats, 0),
      },
    });
  } catch (error) {
    logger.error('getResourceAnalytics', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getEventStoryPdf = async (req, res) => {
  try {
    const eventId = req.params?.id;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const event = await Event.findOne({ _id: eventId, ...EVENT_ACTIVE })
      .populate('createdBy', 'name email')
      .lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const role = normalizeRole(req.user?.role);
    const owner = String(event.createdBy?._id || event.createdBy || '');
    if (role === 'organizer' && owner !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only download stories for your own events' });
    }
    if (!['admin', 'superAdmin', 'organizer', 'facultyCoordinator'].includes(role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const phase = deriveLifecycleStatus(event);
    if (phase !== 'completed' && !['admin', 'superAdmin'].includes(role)) {
      return res.status(400).json({ message: 'Event story is available after the event has completed' });
    }

    const [regCount, scanCount, feedbackRows] = await Promise.all([
      Registration.countDocuments({ eventId: event._id }),
      Attendance.countDocuments({ eventId: event._id }),
      Feedback.find({ eventId: event._id }).populate('userId', 'name email').sort({ createdAt: -1 }).lean(),
    ]);
    const summary = await feedbackService.getEventFeedbackSummary(event._id);
    const seats = Math.max(0, Number(event.totalSeats || 0));
    const unusedSeats = Math.max(0, seats - regCount);
    const wastedCapacityPct = seats > 0 ? Math.round((unusedSeats / seats) * 100) : 0;
    const attendanceRatePct = regCount > 0 ? Math.round((Math.min(regCount, scanCount) / regCount) * 100) : 0;
    const utilizationEfficiencyScore =
      seats <= 0
        ? 0
        : Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (Math.min(seats, regCount) / seats) * 70 +
                  (Math.min(regCount, scanCount) / Math.max(1, regCount)) * 30,
              ),
            ),
          );
    const avgRating = summary.averageRating != null ? Number(summary.averageRating).toFixed(2) : 'n/a';
    const eventStory = [
      `${event.name} concluded with ${scanCount} attended participants from ${regCount} registrations.`,
      seats > 0
        ? `Capacity planning used ${seats} total seats, with ${unusedSeats} unused seats (${wastedCapacityPct}% wasted capacity).`
        : 'No published seat capacity was configured for this event.',
      `Attendance conversion reached ${attendanceRatePct}% and overall utilization efficiency scored ${utilizationEfficiencyScore}/100.`,
      `Participants submitted ${summary.count} feedback entries with an average rating of ${avgRating}.`,
    ].join(' ');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="event-story-${String(eventId)}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text('Event story report', { underline: true });
    doc.moveDown();
    doc.fontSize(14).text(event.name || 'Event');
    doc.fontSize(10).text(`Workflow status: ${event.status || ''} • Timeline phase: ${phase}`);
    const startT = event.startTime || combineDateAndTime(event.date, event.time);
    doc.text(`Start: ${startT ? new Date(startT).toISOString() : '—'}`);
    doc.text(`Location: ${event.location || event.place || '—'}`);
    doc.text(`Seats: ${event.totalSeats} • Registrations: ${regCount} • Attendance scans: ${scanCount}`);
    doc.moveDown();
    doc.fontSize(12).text('Description', { underline: true });
    doc.fontSize(10).text(String(event.description || '—').slice(0, 4000));
    doc.moveDown();
    doc.fontSize(12).text('Participation & feedback', { underline: true });
    doc
      .fontSize(10)
      .text(
        `Feedback submissions: ${summary.count} • Average rating: ${
          summary.averageRating != null ? summary.averageRating : 'n/a'
        }`,
      );
    doc.text(`Attendance rate: ${attendanceRatePct}%`);
    doc.moveDown();
    doc.fontSize(12).text('Resource tracking', { underline: true });
    doc
      .fontSize(10)
      .text(
        `Unused seats: ${unusedSeats} • Wasted capacity: ${wastedCapacityPct}% • Utilization efficiency: ${utilizationEfficiencyScore}/100`,
      );
    doc.moveDown();
    doc.fontSize(12).text('Event story', { underline: true });
    doc.fontSize(10).text(eventStory);
    doc.moveDown();
    doc.fontSize(12).text('Feedback summary', { underline: true });
    for (const f of feedbackRows.slice(0, 30)) {
      const who = f.userId?.name || f.userId?.email || 'Student';
      doc.text(`- ${who}: ${String(f.message || '').slice(0, 500)}`);
    }
    doc.end();
  } catch (error) {
    logger.error('getEventStoryPdf', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  softDeleteEventByAdmin,
  listRecycledEvents,
  restoreRecycledEvent,
  permanentlyDeleteEvent,
  previewEventSimulation,
  getResourceInsights,
  getEventStoryPdf,
  buildSimulationPayload,
  getResourceAnalytics,
};
