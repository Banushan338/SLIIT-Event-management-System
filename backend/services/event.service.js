const { User } = require('../models/user.model');
const { Registration } = require('../models/registration.model');
const notificationService = require('./notification.service');
const { normalizeRole } = require('../utils/rbac');
const { logger } = require('../utils/logger');

function eventDateLabel(event) {
  const d = event?.date ? new Date(event.date) : null;
  if (!d || Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString();
}

function eventTypeLabel(type) {
  const map = {
    academic: 'Academic',
    work: 'Workshop',
    sports: 'Sports',
    social: 'Social',
  };
  const key = String(type || '').toLowerCase();
  return map[key] || 'General';
}

function approvedEventMessage(event) {
  const type = eventTypeLabel(event?.type);
  const date = eventDateLabel(event);
  return `${type} event "${event.name}" is approved. This event is scheduled on ${date}.`;
}

async function notifyPendingApproval(event, { resubmitted = false } = {}) {
  const message = resubmitted
    ? `Resubmitted event pending approval: ${event.name}`
    : `New event pending approval: ${event.name}`;
  try {
    return await notificationService.notifyUsersByRoles(
      ['admin', 'superAdmin', 'facultyCoordinator'],
      {
        title: resubmitted
          ? 'Resubmitted event pending approval'
          : 'New event pending approval',
        message,
        type: 'warning',
        category: 'EVENT_APPROVAL',
        roleTarget: 'ADMIN_FACULTY',
        eventId: event._id,
      },
      { sendEmail: false },
    );
  } catch (error) {
    logger.warn('notifyPendingApproval failed', { message: error.message });
    return { inserted: 0 };
  }
}

async function notifyApproved(event, { approvalNote = '' } = {}) {
  const publishedMessage = approvedEventMessage(event);
  const noteLine = String(approvalNote || '').trim()
    ? ` Note from approver: ${String(approvalNote).trim()}`
    : '';
  const resultStudents = await notificationService.notifyUsersByRoles(
    ['student'],
    {
      title: 'New event available',
      message: publishedMessage,
      type: 'success',
      category: 'APPROVAL',
      roleTarget: 'STUDENT',
      eventId: event._id,
    },
    { sendEmail: true },
  );
  // Also inform organizer + faculty coordinators that approval happened.
  const resultOrganizerFaculty = await notificationService.notifyUsersByIds(
    [String(event.createdBy)],
    {
      title: 'Event approved',
      message: `${publishedMessage} It is now published to students.${noteLine}`,
      type: 'success',
      category: 'APPROVAL',
      roleTarget: 'ORGANIZER',
      eventId: event._id,
    },
    { sendEmail: true },
  );
  await notificationService.notifyUsersByRoles(
    ['facultyCoordinator'],
    {
      title: 'Event approved',
      message: publishedMessage,
      type: 'info',
      category: 'APPROVAL',
      roleTarget: 'FACULTY_COORDINATOR',
      eventId: event._id,
    },
    { sendEmail: false },
  );
  return {
    students: resultStudents,
    organizer: resultOrganizerFaculty,
  };
}

async function notifyRejected(event, reason = '') {
  if (!event?.createdBy) return null;
  const msg = reason
    ? `Your event "${event.name}" was rejected. Reason: ${reason}`
    : `Your event "${event.name}" was rejected.`;
  return notificationService.notifyUser(event.createdBy, {
    title: 'Event rejected',
    message: msg,
    type: 'warning',
    category: 'APPROVAL',
    roleTarget: 'ORGANIZER',
    eventId: event._id,
    sendEmail: true,
  });
}

async function notifyEventUpdated(event) {
  const regs = await Registration.find({ eventId: event._id }).select('userId').lean();
  const participantIds = regs.map((r) => String(r.userId));
  if (participantIds.length === 0) return { inserted: 0 };
  return notificationService.notifyUsersByIds(
    participantIds,
    {
      title: 'Event updated',
      message: `Event details changed: ${event.name}. Please review updated schedule/details.`,
      type: 'info',
      category: 'EVENT',
      roleTarget: 'PARTICIPANT',
      eventId: event._id,
    },
    { sendEmail: false },
  );
}

async function ensureRoleCanApprove(approverId, approverRole, event) {
  const role = normalizeRole(approverRole);
  if (!['admin', 'superAdmin', 'facultyCoordinator'].includes(role)) {
    return { ok: false, status: 403, message: 'Admin or faculty coordinator access required' };
  }
  if (String(event.createdBy) === String(approverId)) {
    return { ok: false, status: 403, message: 'You cannot approve/reject your own event' };
  }
  if (role === 'facultyCoordinator') {
    const [actor, creator] = await Promise.all([
      User.findById(approverId).select('department').lean(),
      User.findById(event.createdBy).select('department').lean(),
    ]);
    const actorDept = String(actor?.department || '').trim().toLowerCase();
    const creatorDept = String(creator?.department || '').trim().toLowerCase();
    // Enforce same department only when both accounts have a department on file.
    // If either is missing, approval is still allowed (avoids blocking when profiles are incomplete).
    if (actorDept && creatorDept && actorDept !== creatorDept) {
      return {
        ok: false,
        status: 403,
        message: 'Faculty coordinators can only approve/reject events from their own department',
      };
    }
  }
  return { ok: true };
}

module.exports = {
  notifyPendingApproval,
  notifyApproved,
  notifyRejected,
  notifyEventUpdated,
  ensureRoleCanApprove,
};
