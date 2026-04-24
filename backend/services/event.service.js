const { Registration } = require('../models/registration.model');
const { User } = require('../models/user.model');
const notificationService = require('./notification.service');

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
  return notificationService.notifyUsersByRoles(
    ['admin', 'superAdmin', 'facultyCoordinator'],
    {
      title: resubmitted ? 'Resubmitted event pending approval' : 'New event pending approval',
      message,
      type: 'warning',
      category: 'EVENT',
      roleTarget: 'ADMIN_FACULTY',
      eventId: event._id,
    },
    { sendEmail: false },
  );
}

async function notifyApproved(event) {
  const publishedMessage = approvedEventMessage(event);
  const resultStudents = await notificationService.notifyUsersByRoles(
    ['student'],
    {
      title: 'New event available',
      message: publishedMessage,
      type: 'success',
      category: 'EVENT',
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
      message: `${publishedMessage} It is now published to students.`,
      type: 'success',
      category: 'EVENT',
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
      category: 'EVENT',
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
    category: 'EVENT',
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
  if (!['admin', 'superAdmin', 'facultyCoordinator'].includes(String(approverRole || ''))) {
    return { ok: false, status: 403, message: 'Admin or faculty coordinator access required' };
  }
  if (String(event.createdBy) === String(approverId)) {
    return { ok: false, status: 403, message: 'You cannot approve/reject your own event' };
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
