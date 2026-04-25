const { Notification } = require('../models/notification.model');
const { User } = require('../models/user.model');
const { sendMail } = require('./email.service');
const { logger } = require('../utils/logger');
const { emitToUser } = require('../utils/socket');

/**
 * Create in-app notification; optionally email if user preferences allow.
 */
function shouldAllowCategory(prefs, category) {
  const c = String(category || '').toUpperCase();
  if (c === 'APPROVAL' || c === 'EVENT_APPROVAL') {
    return prefs.approvalNotifications !== false;
  }
  if (c === 'EVENT' || c === 'EVENT_UPDATE') {
    return prefs.eventNotifications !== false;
  }
  if (c === 'COMMENT') {
    return prefs.commentNotifications !== false;
  }
  if (c === 'MODERATION') {
    return prefs.moderationNotifications !== false;
  }
  if (c === 'SECURITY' || c === 'ACCOUNT' || c === 'ACCOUNT_SECURITY' || c === 'FEEDBACK') {
    return true;
  }
  if (c === 'APPROVAL' || c === 'EVENT_APPROVAL') return prefs.approvalNotifications !== false;
  // Backward compatibility for old lowercase categories
  if (String(category || '').toLowerCase() === 'approval' || String(category || '').toLowerCase() === 'event_approval') {
    return prefs.approvalNotifications !== false;
  }
  if (String(category || '').toLowerCase() === 'event' || String(category || '').toLowerCase() === 'event_update') {
    return prefs.eventNotifications !== false;
  }
  return true;
}

function applyCategoryVisibilityFilter(query, prefs) {
  const blockedCategories = [];
  if (prefs.approvalNotifications === false) {
    blockedCategories.push('approval', 'event_approval', 'APPROVAL', 'EVENT_APPROVAL');
  }
  if (prefs.eventNotifications === false) {
    blockedCategories.push('event', 'event_update', 'EVENT', 'EVENT_UPDATE');
  }
  if (prefs.commentNotifications === false) {
    blockedCategories.push('comment', 'COMMENT');
  }
  if (prefs.moderationNotifications === false) {
    blockedCategories.push('moderation', 'MODERATION');
  }
  if (blockedCategories.length > 0) {
    query.category = { $nin: blockedCategories };
  }
  return query;
}

function mapForClient(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title || '',
    message: doc.message,
    type: doc.type,
    read: doc.read,
    category: doc.category || '',
    roleTarget: doc.roleTarget || '',
    eventId: doc.eventId ? String(doc.eventId) : null,
    createdAt: doc.createdAt,
  };
}

async function notifyUser(
  userId,
  { title, message, type = 'info', category = '', roleTarget = '', eventId = null, sendEmail = false },
) {
  const user = await User.findById(userId).select('email name notificationPreferences');
  if (!user) return null;

  const prefs = user.notificationPreferences || {};
  if (!shouldAllowCategory(prefs, category)) return null;

  let doc = null;
  if (prefs.inApp !== false) {
    doc = await Notification.create({
      userId,
      title: title || '',
      message,
      type,
      category,
      roleTarget,
      eventId,
      read: false,
    });
    emitToUser(userId, 'notification:new', mapForClient(doc));
  }

  if (sendEmail && prefs.email !== false) {
    try {
      await sendMail({
        to: user.email,
        subject: title || 'SLIIT Events notification',
        text: message,
        html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
      });
    } catch (e) {
      logger.warn('Notification email failed', { message: e.message });
    }
  }

  return doc;
}

async function notifyUsersByIds(
  userIds,
  payload,
  { sendEmail = false } = {},
) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (ids.length === 0) return { inserted: 0 };

  const users = await User.find({ _id: { $in: ids } }).select(
    '_id email notificationPreferences',
  );
  const docs = [];
  for (const u of users) {
    const prefs = u.notificationPreferences || {};
    if (!shouldAllowCategory(prefs, payload.category || '')) continue;
    if (prefs.inApp !== false) {
      docs.push({
        userId: u._id,
        title: payload.title || '',
        message: payload.message,
        type: payload.type || 'info',
        category: payload.category || '',
        roleTarget: payload.roleTarget || '',
        eventId: payload.eventId || null,
        read: false,
      });
    }
    if (sendEmail && prefs.email !== false) {
      sendMail({
        to: u.email,
        subject: payload.title || 'SLIIT Events notification',
        text: payload.message,
        html: `<p>${String(payload.message || '').replace(/\n/g, '<br/>')}</p>`,
      }).catch((e) => {
        logger.warn('Bulk notification email failed', { message: e.message });
      });
    }
  }
  if (docs.length === 0) return { inserted: 0 };
  const inserted = await Notification.insertMany(docs, { ordered: false });
  for (const d of inserted) {
    emitToUser(d.userId, 'notification:new', mapForClient(d));
  }
  return { inserted: inserted.length };
}

async function notifyUsersByRoles(roles, payload, options = {}) {
  const roleList = [...new Set((roles || []).map((r) => String(r).trim()).filter(Boolean))];
  if (roleList.length === 0) return { inserted: 0 };
  const users = await User.find({ role: { $in: roleList }, status: 'active' })
    .select('_id')
    .lean();
  return notifyUsersByIds(users.map((u) => String(u._id)), payload, options);
}

async function listForUser(userId, { limit = 50, unreadOnly = false } = {}) {
  const user = await User.findById(userId).select('notificationPreferences').lean();
  if (!user) return [];
  const prefs = user.notificationPreferences || {};
  const q = { userId };
  if (unreadOnly) q.read = false;
  applyCategoryVisibilityFilter(q, prefs);
  return Notification.find(q).sort({ createdAt: -1 }).limit(limit).lean();
}

async function markRead(notificationId, userId, read = true) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: Boolean(read) },
    { new: true },
  );
}

async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { read: true });
}

async function unreadCount(userId) {
  const user = await User.findById(userId).select('notificationPreferences').lean();
  if (!user) return 0;
  const prefs = user.notificationPreferences || {};
  const q = { userId, read: false };
  applyCategoryVisibilityFilter(q, prefs);
  return Notification.countDocuments(q);
}

module.exports = {
  notifyUser,
  notifyUsersByIds,
  notifyUsersByRoles,
  listForUser,
  markRead,
  markAllRead,
  unreadCount,
};
