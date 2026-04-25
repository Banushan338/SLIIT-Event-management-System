const { Event } = require('../models/event.model');
const { Notification } = require('../models/notification.model');
const { logger } = require('../utils/logger');
const { deriveLifecycleStatus } = require('../utils/eventLifecycle');
const { EVENT_ACTIVE } = require('../utils/eventQueries');

const monthKey = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short' });

const getFacultyOverview = async (req, res) => {
  try {
    const events = await Event.find({ ...EVENT_ACTIVE }).select('status createdAt startTime endTime date time').lean();

    const stats = events.reduce(
      (acc, e) => {
        acc.totalEvents += 1;
        if (e.status === 'pending') acc.pendingApprovals += 1;
        if (e.status === 'approved') acc.approvedEvents += 1;
        if (e.status === 'rejected') acc.rejectedEvents += 1;
        if (e.status === 'completed') acc.completedEvents += 1;
        return acc;
      },
      {
        totalEvents: 0,
        pendingApprovals: 0,
        approvedEvents: 0,
        rejectedEvents: 0,
        completedEvents: 0,
      },
    );

    let upcoming = 0;
    let ongoing = 0;
    let completed = 0;
    for (const e of events) {
      if (e.status !== 'approved' && e.status !== 'completed') continue;
      const phase = deriveLifecycleStatus(e);
      if (phase === 'upcoming') upcoming += 1;
      else if (phase === 'ongoing') ongoing += 1;
      else if (phase === 'completed') completed += 1;
    }

    stats.lifecycleUpcoming = upcoming;
    stats.lifecycleOngoing = ongoing;
    stats.lifecycleCompleted = completed;

    // Trend: events created over last 6 months (by createdAt month label)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        name: monthKey(d),
        value: 0,
      });
    }
    const indexByKey = new Map(months.map((m, idx) => [m.key, idx]));
    for (const e of events) {
      const d = new Date(e.createdAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const idx = indexByKey.get(k);
      if (idx !== undefined) months[idx].value += 1;
    }

    return res.status(200).json({ stats, trends: months });
  } catch (error) {
    logger.error('Error building faculty overview', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listFacultyNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ targetRole: 'facultyCoordinator' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      notifications: items.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        message: n.message,
        read: Boolean(n.read),
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing faculty notifications', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getFacultyOverview, listFacultyNotifications };
