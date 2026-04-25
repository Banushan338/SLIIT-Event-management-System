const { Comment } = require('../models/comment.model');
const { Event } = require('../models/event.model');
const { EVENT_ACTIVE } = require('../utils/eventQueries');
const commentService = require('../services/comment.service');
const notificationService = require('../services/notification.service');
const { normalizeRole } = require('../utils/rbac');
const { logger } = require('../utils/logger');

function toDto(c) {
  return {
    id: c._id.toString(),
    userId: c.userId?._id?.toString?.() || c.userId?.toString?.() || '',
    user: c.userId && c.userId.name ? {
      id: c.userId._id.toString(),
      name: c.userId.name,
      email: c.userId.email,
      role: c.userId.role,
      profileImage: c.userId.profileImage || '',
    } : null,
    eventId: c.eventId?.toString?.() || '',
    comment: c.comment,
    visibility: c.visibility,
    visibleRoles: c.visibleRoles || [],
    isOverridden: Boolean(c.isOverridden),
    hidden: Boolean(c.hidden),
    createdAt: c.createdAt,
  };
}

const postComment = async (req, res) => {
  try {
    const { eventId, comment, visibility, visibleRoles } = req.body || {};
    const created = await commentService.createComment({
      userId: req.user.id,
      eventId,
      text: comment,
      visibility,
      visibleRoles,
    });
    const withUser = await Comment.findById(created._id).populate('userId', 'name email role profileImage');
    const event = await Event.findOne({ _id: eventId, ...EVENT_ACTIVE }).select('name createdBy').lean();
    const organizerId = String(event?.createdBy || '');
    const roleRecipients = ['admin', 'superAdmin', 'facultyCoordinator'];
    const commentTargets = new Set([organizerId]);
    const roleUsers = await notificationService.notifyUsersByRoles(
      roleRecipients,
      {
        title: 'New comment added',
        message: `New comment added to ${event?.name || 'an event'}.`,
        type: 'info',
        category: 'COMMENT',
        roleTarget: 'ADMIN_ORGANIZER_FACULTY',
        eventId,
      },
      { sendEmail: false },
    );
    if (roleUsers?.inserted >= 0 && organizerId) {
      // Ensure organizer always gets notified if not already covered by role.
      await notificationService.notifyUsersByIds(
        [...commentTargets],
        {
          title: 'New comment added',
          message: `New comment added to ${event?.name || 'an event'}.`,
          type: 'info',
          category: 'COMMENT',
          roleTarget: 'ORGANIZER',
          eventId,
        },
        { sendEmail: false },
      );
    }
    return res.status(201).json({ message: 'Comment posted', comment: toDto(withUser) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    logger.error('postComment', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getCommentsByEvent = async (req, res) => {
  try {
    const eventId = req.params?.eventId;
    const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query?.limit, 10) || 30));
    const viewerRole = normalizeRole(req.user?.role);
    const [rows, total] = await Promise.all([
      commentService.listCommentsForViewer({ eventId, viewerRole, page, limit }),
      Comment.countDocuments({ eventId, hidden: { $ne: true } }),
    ]);
    return res.status(200).json({
      comments: rows.map(toDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error('getCommentsByEvent', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getCommentsForModeration = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!['admin', 'superAdmin', 'organizer'].includes(role)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const eventId = req.query?.eventId;
    const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query?.limit, 10) || 50));
    let rows = await commentService.listCommentsForViewer({
      eventId,
      viewerRole: role,
      includeHidden: true,
      page,
      limit,
    });
    if (role === 'organizer') {
      const events = await Event.find({ createdBy: req.user.id }).select('_id').lean();
      const allowed = new Set(events.map((e) => e._id.toString()));
      rows = rows.filter((r) => allowed.has(String(r.eventId)));
    }
    return res.status(200).json({ comments: rows.map(toDto), pagination: { page, limit } });
  } catch (error) {
    logger.error('getCommentsForModeration', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const patchVisibility = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!['admin', 'superAdmin', 'organizer'].includes(role)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const target = await Comment.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Comment not found' });
    if (role === 'organizer') {
      const event = await Event.findOne({ _id: target.eventId, ...EVENT_ACTIVE }).select('createdBy').lean();
      if (!event || String(event.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Organizer can moderate only own events' });
      }
    }
    const vis = commentService.normalizeVisibilityInput(req.body?.visibility, req.body?.visibleRoles);
    target.visibility = vis.visibility;
    target.visibleRoles = vis.visibleRoles;
    target.isOverridden = true;
    target.overriddenBy = req.user.id;
    const hadHiddenFlag = typeof req.body?.hidden === 'boolean';
    if (typeof req.body?.hidden === 'boolean') target.hidden = req.body.hidden;
    await target.save();
    const withUser = await Comment.findById(target._id).populate('userId', 'name email role profileImage');
    await notificationService.notifyUser(
      target.userId,
      {
        title: hadHiddenFlag ? (target.hidden ? 'Comment hidden' : 'Comment unhidden') : 'Comment visibility updated',
        message: hadHiddenFlag
          ? (target.hidden ? 'Your comment was hidden by moderator.' : 'Your comment was made visible by moderator.')
          : 'Your comment visibility was updated.',
        type: 'warning',
        category: 'MODERATION',
        roleTarget: 'COMMENT_OWNER',
        eventId: target.eventId,
        sendEmail: false,
      },
    );
    return res.status(200).json({ message: 'Comment visibility updated', comment: toDto(withUser) });
  } catch (error) {
    logger.error('patchVisibility', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const removeComment = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const target = await Comment.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Comment not found' });
    const isOwner = String(target.userId) === String(req.user.id);
    let isEventOrganizer = false;
    if (!isOwner) {
      const ev = await Event.findOne({ _id: target.eventId, ...EVENT_ACTIVE }).select('createdBy').lean();
      isEventOrganizer = ev && String(ev.createdBy) === String(req.user.id);
    }
    if (!isOwner && !isEventOrganizer && !['admin', 'superAdmin'].includes(role)) {
      return res.status(403).json({ message: 'Not allowed to delete this comment' });
    }
    await Comment.deleteOne({ _id: target._id });
    const actorRole = ['admin', 'superAdmin'].includes(role) ? 'admin' : 'organizer';
    await notificationService.notifyUser(
      target.userId,
      {
        title: 'Comment removed',
        message: `Your comment was removed by ${actorRole}.`,
        type: 'warning',
        category: 'MODERATION',
        roleTarget: 'COMMENT_OWNER',
        eventId: target.eventId,
        sendEmail: false,
      },
    );
    return res.status(200).json({ message: 'Comment deleted' });
  } catch (error) {
    logger.error('removeComment', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  postComment,
  getCommentsByEvent,
  getCommentsForModeration,
  patchVisibility,
  removeComment,
};
