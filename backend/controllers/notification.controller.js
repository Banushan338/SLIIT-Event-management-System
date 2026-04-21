const { User } = require('../models/user.model');
const notificationService = require('../services/notification.service');
const { logger } = require('../utils/logger');

const listMine = async (req, res) => {
  try {
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
    const rows = await notificationService.listForUser(req.user.id, {
      limit: Number(req.query.limit) || 50,
      unreadOnly,
    });
    return res.status(200).json({
      notifications: rows.map((n) => ({
        id: n._id.toString(),
        title: n.title || '',
        message: n.message,
        type: n.type,
        read: n.read,
        category: n.category || '',
        roleTarget: n.roleTarget || '',
        eventId: n.eventId ? n.eventId.toString() : null,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    logger.error('listMine notifications', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.unreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (error) {
    logger.error('unreadCount', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const patchRead = async (req, res) => {
  try {
    const desiredRead = typeof req.body?.read === 'boolean' ? req.body.read : true;
    const updated = await notificationService.markRead(req.params.id, req.user.id, desiredRead);
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ message: 'Updated', id: updated._id.toString() });
  } catch (error) {
    logger.error('patchRead', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const patchReadBulk = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((x) => String(x))
      : req.body?.id
        ? [String(req.body.id)]
        : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: 'id or ids[] is required' });
    }
    const desiredRead = typeof req.body?.read === 'boolean' ? req.body.read : true;
    const updates = await Promise.all(
      ids.map((id) => notificationService.markRead(id, req.user.id, desiredRead)),
    );
    const updatedIds = updates.filter(Boolean).map((u) => u._id.toString());
    return res.status(200).json({ message: 'Updated', ids: updatedIds });
  } catch (error) {
    logger.error('patchReadBulk', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const postReadAll = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.id);
    return res.status(200).json({ message: 'All marked read' });
  } catch (error) {
    logger.error('postReadAll', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const patchPreferences = async (req, res) => {
  try {
    const {
      email,
      sms,
      inApp,
      eventNotifications,
      approvalNotifications,
      commentNotifications,
      moderationNotifications,
    } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.notificationPreferences = user.notificationPreferences || {};
    if (typeof email === 'boolean') user.notificationPreferences.email = Boolean(email);
    if (typeof sms === 'boolean') user.notificationPreferences.sms = Boolean(sms);
    if (typeof inApp === 'boolean') user.notificationPreferences.inApp = Boolean(inApp);
    if (typeof eventNotifications === 'boolean') {
      user.notificationPreferences.eventNotifications = Boolean(eventNotifications);
    }
    if (typeof approvalNotifications === 'boolean') {
      user.notificationPreferences.approvalNotifications = Boolean(approvalNotifications);
    }
    if (typeof commentNotifications === 'boolean') {
      user.notificationPreferences.commentNotifications = Boolean(commentNotifications);
    }
    if (typeof moderationNotifications === 'boolean') {
      user.notificationPreferences.moderationNotifications = Boolean(moderationNotifications);
    }
    user.markModified('notificationPreferences');
    await user.save();
    return res.status(200).json({
      message: 'Preferences updated',
      notificationPreferences: user.notificationPreferences,
    });
  } catch (error) {
    logger.error('patchPreferences', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listMine,
  getUnreadCount,
  patchRead,
  patchReadBulk,
  postReadAll,
  patchPreferences,
};
