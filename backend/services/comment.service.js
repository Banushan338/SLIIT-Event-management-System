const mongoose = require('mongoose');
const { Comment } = require('../models/comment.model');
const { Event } = require('../models/event.model');
const { EVENT_ACTIVE } = require('../utils/eventQueries');
const { normalizeRole } = require('../utils/rbac');

const ADMIN_ONLY_ROLES = ['admin', 'superAdmin', 'organizer', 'facultyCoordinator'];

function sanitizeComment(text) {
  return String(text || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

function normalizeVisibilityInput(visibility, visibleRoles) {
  const vis = String(visibility || 'PUBLIC').toUpperCase();
  if (vis === 'ADMIN_ONLY') {
    return { visibility: 'ADMIN_ONLY', visibleRoles: ADMIN_ONLY_ROLES };
  }
  if (vis === 'ROLE_BASED') {
    const roles = [...new Set((visibleRoles || []).map((r) => normalizeRole(r)).filter(Boolean))];
    if (roles.length === 0) {
      const err = new Error('visibleRoles is required for ROLE_BASED visibility');
      err.statusCode = 400;
      throw err;
    }
    return { visibility: 'ROLE_BASED', visibleRoles: roles };
  }
  return { visibility: 'PUBLIC', visibleRoles: [] };
}

function canViewComment(comment, viewerRole) {
  const role = normalizeRole(viewerRole);
  if (['admin', 'superAdmin'].includes(role)) return true;
  if (comment.visibility === 'PUBLIC') return true;
  if (comment.visibility === 'ADMIN_ONLY') {
    return ADMIN_ONLY_ROLES.includes(role);
  }
  return (comment.visibleRoles || []).includes(role);
}

async function assertCanComment({ eventId }) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const err = new Error('Invalid event id');
    err.statusCode = 400;
    throw err;
  }
  const event = await Event.findOne({ _id: eventId, ...EVENT_ACTIVE }).lean();
  if (!event) {
    const err = new Error('Event not found');
    err.statusCode = 404;
    throw err;
  }
  return event;
}

async function createComment({ userId, eventId, text, visibility, visibleRoles }) {
  await assertCanComment({ eventId });
  const safeText = sanitizeComment(text);
  if (!safeText) {
    const err = new Error('comment text is required');
    err.statusCode = 400;
    throw err;
  }
  const vis = normalizeVisibilityInput(visibility, visibleRoles);
  const created = await Comment.create({
    userId,
    eventId,
    comment: safeText,
    visibility: vis.visibility,
    visibleRoles: vis.visibleRoles,
    isOverridden: false,
  });
  return created;
}

async function listCommentsForViewer({ eventId, viewerRole, includeHidden = false, page = 1, limit = 30 }) {
  const q = {};
  if (eventId) q.eventId = eventId;
  if (!includeHidden) q.hidden = { $ne: true };
  const skip = (page - 1) * limit;
  const rows = await Comment.find(q)
    .populate('userId', 'name email role profileImage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return rows.filter((c) => canViewComment(c, viewerRole));
}

module.exports = {
  ADMIN_ONLY_ROLES,
  sanitizeComment,
  normalizeVisibilityInput,
  canViewComment,
  assertCanComment,
  createComment,
  listCommentsForViewer,
};
