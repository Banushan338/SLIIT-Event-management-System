const mongoose = require('mongoose');
const { Event, EVENT_TYPES } = require('../models/event.model');
const { Attendance } = require('../models/attendance.model');
const { Registration } = require('../models/registration.model');
const { logger } = require('../utils/logger');
const eventService = require('../services/event.service');
const { normalizeRole } = require('../utils/rbac');

/** Local calendar YYYY-MM-DD for a Date (matches browser date inputs). */
function formatLocalYmd(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validates that combined date + time is not in the past.
 * `dateInput` may be YYYY-MM-DD string or a Date.
 */
function validateEventStartNotInPast(dateInput, timeStr) {
  const t = String(timeStr || '').trim();
  if (!t) {
    return { ok: false, message: 'time is required' };
  }
  let ymd =
    typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
      ? dateInput.trim()
      : formatLocalYmd(dateInput);
  if (!ymd) {
    return { ok: false, message: 'Invalid date' };
  }
  const start = new Date(`${ymd}T${t}`);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, message: 'Invalid date or time' };
  }
  if (start.getTime() < Date.now()) {
    return {
      ok: false,
      message: 'Event date and time must be today or later, and not in the past.',
    };
  }
  return { ok: true };
}

const requireOrganizer = (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (role !== 'organizer') {
    return res.status(403).json({ message: 'Organizer access required' });
  }
  return null;
};

const requireFacultyCoordinator = (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (role !== 'facultyCoordinator') {
    return res
      .status(403)
      .json({ message: 'Faculty coordinator access required' });
  }
  return null;
};

const requireApprover = (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['admin', 'superAdmin', 'facultyCoordinator'].includes(role)) {
    return res
      .status(403)
      .json({ message: 'Admin or faculty coordinator access required' });
  }
  return null;
};

const requireStudent = (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  return null;
};

const requireStudentOrStaff = (req, res) => {
  const role = normalizeRole(req.user?.role);
  if (!['student', 'staff'].includes(role)) {
    return res.status(403).json({ message: 'Student or staff access required' });
  }
  return null;
};

function combineDateAndTime(dateInput, timeInput) {
  if (!dateInput || !timeInput) return null;
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) return null;
  const hhmm = String(timeInput).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const next = new Date(dateObj);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return Number.isNaN(next.getTime()) ? null : next;
}

function deriveLifecycleStatus(event, now = new Date()) {
  const current = String(event?.status || '').toLowerCase();
  if (current === 'cancelled') return 'cancelled';
  const start = event?.startTime ? new Date(event.startTime) : combineDateAndTime(event?.date, event?.time);
  const end = event?.endTime ? new Date(event.endTime) : null;
  if (!start || Number.isNaN(start.getTime())) return current || 'upcoming';
  if (end && Number.isNaN(end.getTime())) return current || 'upcoming';
  if (now < start) return 'upcoming';
  if (end && now >= start && now <= end) return 'ongoing';
  if (!end && now >= start) return 'ongoing';
  return 'completed';
}

function resolveDurationMinutes(start, end, fallback = 60) {
  if (!start || !end) return fallback;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback;
}

function resolveEndFromDuration(start, durationMinutes) {
  const mins = Number.parseInt(durationMinutes, 10);
  if (!start || !Number.isFinite(mins) || mins < 1) return null;
  return new Date(start.getTime() + mins * 60000);
}

function getSortBucket(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'upcoming') return 0;
  if (normalized === 'ongoing') return 1;
  return 2;
}

function canManageEvent(user, eventDoc) {
  const role = normalizeRole(user?.role);
  if (['admin', 'superAdmin'].includes(role)) return true;
  if (role !== 'organizer') return false;
  const ownerId = eventDoc?.organizerId || eventDoc?.createdBy;
  return String(ownerId || '') === String(user?.id || '');
}

function eventToLifecycleDto(event) {
  const id = event?._id || event?.id || null;
  const startTime = event.startTime || combineDateAndTime(event.date, event.time);
  const resolvedEndTime = event.endTime || null;
  const durationMinutes = resolveDurationMinutes(
    startTime ? new Date(startTime) : null,
    resolvedEndTime ? new Date(resolvedEndTime) : null,
    Number.isFinite(event.durationMinutes) ? event.durationMinutes : 60,
  );
  const computedStatus = deriveLifecycleStatus({ ...event, startTime, endTime: event.endTime, status: event.status });
  const organizerObj = event.organizerId || event.createdBy;
  return {
    id: id ? String(id) : '',
    title: event.title || event.name,
    name: event.name || event.title,
    description: event.description || '',
    organizerId: organizerObj?._id ? String(organizerObj._id) : (event.organizerId || event.createdBy)?.toString?.() || null,
    organizer: organizerObj?._id
      ? {
          id: String(organizerObj._id),
          name: organizerObj.name,
          email: organizerObj.email,
          role: organizerObj.role,
        }
      : null,
    startTime,
    endTime: resolvedEndTime,
    durationMinutes,
    location: event.location || event.place || '',
    status: computedStatus,
    finishedAt: computedStatus === 'completed' ? resolvedEndTime : null,
    cancellationReason: event.cancellationReason || '',
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

const createLifecycleEvent = async (req, res) => {
  try {
    if (!['organizer', 'admin', 'superAdmin'].includes(normalizeRole(req.user?.role))) {
      return res.status(403).json({ message: 'Organizer or admin access required' });
    }
    const body = req.body || {};
    const rawTitle = body.title || body.name;
    const parsedStart = body.startTime
      ? new Date(body.startTime)
      : combineDateAndTime(body.date, body.time);
    const parsedEnd = body.endTime
      ? new Date(body.endTime)
      : resolveEndFromDuration(parsedStart, body.durationMinutes) || (parsedStart ? new Date(parsedStart.getTime() + 60 * 60 * 1000) : null);
    const resolvedLocation = body.location || body.place;
    if (!rawTitle || !parsedStart || !parsedEnd || !resolvedLocation) {
      return res.status(400).json({ message: 'title/name, startTime/date+time, endTime and location/place are required' });
    }
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ message: 'Invalid startTime or endTime' });
    }
    if (parsedEnd <= parsedStart) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }
    const base = {
      title: String(rawTitle).trim(),
      name: String(rawTitle).trim(),
      description: String(body.description || '').trim(),
      startTime: parsedStart,
      endTime: parsedEnd,
      durationMinutes: resolveDurationMinutes(parsedStart, parsedEnd, Number.parseInt(body.durationMinutes, 10) || 60),
      location: String(resolvedLocation).trim(),
      place: String(resolvedLocation).trim(),
      date: parsedStart,
      time: `${String(parsedStart.getHours()).padStart(2, '0')}:${String(parsedStart.getMinutes()).padStart(2, '0')}`,
      organizerId: req.user.id,
      createdBy: req.user.id,
      type: body?.type && EVENT_TYPES.includes(body.type) ? body.type : 'work',
      totalSeats: Number.parseInt(body?.totalSeats, 10) > 0 ? Number.parseInt(body.totalSeats, 10) : 100,
    };
    const status = deriveLifecycleStatus({ ...base, status: 'upcoming' });
    const created = await Event.create({ ...base, status });
    return res.status(201).json({ event: eventToLifecycleDto(created.toObject()) });
  } catch (error) {
    logger.error('Error creating lifecycle event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listLifecycleEvents = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!['organizer', 'admin', 'superAdmin', 'facultyCoordinator'].includes(role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const { status, organizerId, q, datePreset, startDate, endDate } = req.query || {};
    const query = {};
    if (organizerId) query.organizerId = organizerId;
    if (q) query.$or = [{ title: { $regex: String(q), $options: 'i' } }, { name: { $regex: String(q), $options: 'i' } }];
    const now = new Date();
    if (datePreset === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      query.startTime = { $gte: start, $lte: end };
    } else if (datePreset === 'week') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      query.startTime = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    const docs = await Event.find(query)
      .populate('organizerId', 'name email role')
      .populate('createdBy', 'name email role')
      .lean();
    const mapped = docs
      .map((e) => {
        const nextStatus = deriveLifecycleStatus(e);
        return { ...eventToLifecycleDto(e), status: nextStatus };
      })
      .filter((e) => (!status ? true : e.status === String(status).toLowerCase()))
      .sort((a, b) => {
        const bucketA = getSortBucket(a.status);
        const bucketB = getSortBucket(b.status);
        if (bucketA !== bucketB) return bucketA - bucketB;
        const tA = new Date(a.startTime || 0).getTime();
        const tB = new Date(b.startTime || 0).getTime();
        return tA - tB;
      });
    return res.status(200).json({ events: mapped });
  } catch (error) {
    logger.error('Error listing lifecycle events', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getLifecycleEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email role')
      .populate('createdBy', 'name email role')
      .lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });
    return res.status(200).json({ event: eventToLifecycleDto(event) });
  } catch (error) {
    logger.error('Error getting lifecycle event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateLifecycleEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(req.user, event)) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }
    const body = req.body || {};
    const nextTitle =
      body?.title !== undefined
        ? String(body.title).trim()
        : (body?.name !== undefined ? String(body.name).trim() : (event.title || event.name));
    const nextDescription =
      req.body?.description !== undefined ? String(req.body.description).trim() : event.description;
    const nextLocation =
      body?.location !== undefined
        ? String(body.location).trim()
        : (body?.place !== undefined ? String(body.place).trim() : (event.location || event.place));
    const nextStart = body?.startTime
      ? new Date(body.startTime)
      : (body?.date || body?.time
          ? combineDateAndTime(body.date || event.date, body.time || event.time)
          : (event.startTime || combineDateAndTime(event.date, event.time)));
    const nextEnd = body?.endTime
      ? new Date(body.endTime)
      : (resolveEndFromDuration(nextStart, body?.durationMinutes)
          || event.endTime
          || (nextStart ? new Date(nextStart.getTime() + 60 * 60 * 1000) : null));
    if (!nextTitle || !nextStart || Number.isNaN(nextStart.getTime()) || !nextEnd || Number.isNaN(nextEnd.getTime()) || nextEnd <= nextStart || !nextLocation) {
      return res.status(400).json({ message: 'Invalid title/location/startTime/endTime payload' });
    }
    event.title = nextTitle;
    event.name = nextTitle;
    event.description = nextDescription;
    event.location = nextLocation;
    event.place = nextLocation;
    event.startTime = nextStart;
    event.endTime = nextEnd;
    event.durationMinutes = resolveDurationMinutes(nextStart, nextEnd, Number.parseInt(body?.durationMinutes, 10) || event.durationMinutes || 60);
    event.date = nextStart;
    event.time = `${String(nextStart.getHours()).padStart(2, '0')}:${String(nextStart.getMinutes()).padStart(2, '0')}`;
    event.status = deriveLifecycleStatus(event);
    await event.save();
    const populated = await Event.findById(event._id)
      .populate('organizerId', 'name email role')
      .populate('createdBy', 'name email role')
      .lean();
    return res.status(200).json({ event: eventToLifecycleDto(populated) });
  } catch (error) {
    logger.error('Error updating lifecycle event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const cancelLifecycleEvent = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Cancellation reason is required' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(req.user, event)) {
      return res.status(403).json({ message: 'You can only cancel your own events' });
    }
    event.status = 'cancelled';
    event.cancellationReason = reason;
    await event.save();
    const populated = await Event.findById(event._id)
      .populate('organizerId', 'name email role')
      .populate('createdBy', 'name email role')
      .lean();
    return res.status(200).json({ event: eventToLifecycleDto(populated) });
  } catch (error) {
    logger.error('Error cancelling lifecycle event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteLifecycleEvent = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!['admin', 'superAdmin'].includes(role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Event not found' });
    return res.status(200).json({ message: 'Event deleted' });
  } catch (error) {
    logger.error('Error deleting lifecycle event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createEvent = async (req, res) => {
  try {
    const deny = requireOrganizer(req, res);
    if (deny) return;

    const {
      name,
      description = '',
      type,
      date,
      time,
      place,
      totalSeats,
      thumbnailUrl = '',
    } = req.body || {};

    if (!name || !type || !date || !time || !place || !totalSeats) {
      return res.status(400).json({
        message:
          'name, type, date, time, place and totalSeats are required fields',
      });
    }

    if (!EVENT_TYPES.includes(type)) {
      return res.status(400).json({
        message: 'Invalid event type. Allowed: academic, work, sports, social',
      });
    }

    const seats = Number.parseInt(totalSeats, 10);
    if (!Number.isFinite(seats) || seats < 1) {
      return res
        .status(400)
        .json({ message: 'totalSeats must be a number >= 1' });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const startCheck = validateEventStartNotInPast(String(date).trim(), time);
    if (!startCheck.ok) {
      return res.status(400).json({ message: startCheck.message });
    }

    const created = await Event.create({
      name: String(name).trim(),
      description: String(description).trim(),
      type,
      date: parsedDate,
      time: String(time).trim(),
      place: String(place).trim(),
      totalSeats: seats,
      thumbnailUrl: String(thumbnailUrl).trim(),
      createdBy: req.user.id,
    });

    logger.info('Event created', {
      eventId: created._id.toString(),
      createdBy: req.user.id,
    });
    await eventService.notifyPendingApproval(created);

    return res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: created._id.toString(),
        name: created.name,
        description: created.description,
        type: created.type,
        date: created.date,
        time: created.time,
        place: created.place,
        totalSeats: created.totalSeats,
        thumbnailUrl: created.thumbnailUrl,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listMyEvents = async (req, res) => {
  try {
    const deny = requireOrganizer(req, res);
    if (deny) return;

    const items = await Event.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = items.map((e) => e._id);

    const registrationsAgg =
      eventIds.length === 0
        ? []
        : await Registration.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            { $group: { _id: '$eventId', registrations: { $sum: 1 } } },
          ]);
    const registrationsByEventId = new Map(
      registrationsAgg.map((x) => [String(x._id), x.registrations])
    );

    const attendanceAgg =
      eventIds.length === 0
        ? []
        : await Attendance.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            { $group: { _id: '$eventId', scans: { $sum: 1 } } },
          ]);
    const scansByEventId = new Map(
      attendanceAgg.map((x) => [String(x._id), x.scans])
    );

    return res.status(200).json({
      events: items.map((e) => ({
        id: e._id.toString(),
        name: e.name,
        description: e.description,
        type: e.type,
        date: e.date,
        time: e.time,
        place: e.place,
        totalSeats: e.totalSeats,
        registeredCount: registrationsByEventId.get(String(e._id)) || 0,
        scannedCount: scansByEventId.get(String(e._id)) || 0,
        thumbnailUrl: e.thumbnailUrl,
        status: e.status,
        resubmission: e.resubmission || {},
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing organizer events', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateMyEvent = async (req, res) => {
  try {
    const deny = requireOrganizer(req, res);
    if (deny) return;

    const eventId = req.params?.id;
    if (!eventId) {
      return res.status(400).json({ message: 'Event id is required' });
    }

    const event = await Event.findOne({ _id: eventId, createdBy: req.user.id });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const {
      name,
      description,
      type,
      date,
      time,
      place,
      totalSeats,
      thumbnailUrl,
      status,
    } = req.body || {};

    if (typeof name === 'string') event.name = name.trim();
    if (typeof description === 'string') event.description = description.trim();
    if (typeof type === 'string') {
      if (!EVENT_TYPES.includes(type)) {
        return res.status(400).json({
          message: 'Invalid event type. Allowed: academic, work, sports, social',
        });
      }
      event.type = type;
    }
    if (typeof date === 'string' || date instanceof Date) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date' });
      }
      event.date = parsedDate;
    }
    if (typeof time === 'string') event.time = time.trim();
    if (typeof place === 'string') event.place = place.trim();
    if (totalSeats !== undefined) {
      const seats = Number.parseInt(totalSeats, 10);
      if (!Number.isFinite(seats) || seats < 1) {
        return res
          .status(400)
          .json({ message: 'totalSeats must be a number >= 1' });
      }
      event.totalSeats = seats;
    }
    if (typeof thumbnailUrl === 'string') event.thumbnailUrl = thumbnailUrl.trim();

    // Optional: allow organizer to set status (e.g., mark completed)
    if (typeof status === 'string') {
      const allowed = ['pending', 'completed'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: 'Invalid status update. Allowed: pending, completed',
        });
      }
      event.status = status;
    }

    const requestedReapproval = Boolean(req.body?.requestReapproval);
    const changedByOrganizer = ['name', 'description', 'type', 'date', 'time', 'place', 'totalSeats', 'thumbnailUrl']
      .some((k) => req.body?.[k] !== undefined);
    const previousStatus = event.status;

    if (changedByOrganizer && previousStatus === 'approved') {
      if (!requestedReapproval) {
        return res.status(400).json({
          message: 'Editing an approved event requires requestReapproval=true for admin re-check.',
        });
      }
      event.status = 'pending';
      event.resubmission = {
        ...(event.resubmission || {}),
        requestedReapproval: true,
        resubmittedAt: new Date(),
      };
      event.decision = { decidedBy: null, decidedAt: null, rejectionReason: '' };
    }

    if (changedByOrganizer && previousStatus === 'rejected') {
      event.status = 'pending';
      event.resubmission = {
        ...(event.resubmission || {}),
        wasRejectedBefore: true,
        previousRejectionReason: event.decision?.rejectionReason || '',
        requestedReapproval: true,
        resubmittedAt: new Date(),
      };
      event.decision = { decidedBy: null, decidedAt: null, rejectionReason: '' };
    }

    await event.save();
    if (previousStatus === 'approved' && event.status === 'approved') {
      await eventService.notifyEventUpdated(event);
    }
    if (event.status === 'pending' && changedByOrganizer && ['approved', 'rejected'].includes(previousStatus)) {
      await eventService.notifyPendingApproval(event, { resubmitted: true });
    }

    return res.status(200).json({
      message: 'Event updated successfully',
      event: {
        id: event._id.toString(),
        name: event.name,
        description: event.description,
        type: event.type,
        date: event.date,
        time: event.time,
        place: event.place,
        totalSeats: event.totalSeats,
        thumbnailUrl: event.thumbnailUrl,
        status: event.status,
        resubmission: event.resubmission || {},
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const checkInQr = async (req, res) => {
  try {
    const deny = requireOrganizer(req, res);
    if (deny) return;

    const eventId = req.params?.id;
    if (!eventId) {
      return res.status(400).json({ message: 'Event id is required' });
    }

    const event = await Event.findOne({ _id: eventId, createdBy: req.user.id });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const rawQr = String(req.body?.rawQr || '').trim();
    if (!rawQr) {
      return res.status(400).json({ message: 'rawQr is required' });
    }

    const created = await Attendance.create({
      eventId: event._id,
      organizerId: req.user.id,
      rawQr,
      scannedAt: new Date(),
    });

    return res.status(201).json({
      message: 'QR scanned and recorded',
      checkIn: {
        id: created._id.toString(),
        eventId: created.eventId.toString(),
        rawQr: created.rawQr,
        scannedAt: created.scannedAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This QR was already scanned' });
    }
    logger.error('Error recording check-in', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listPendingEvents = async (req, res) => {
  try {
    const deny = requireApprover(req, res);
    if (deny) return;

    const items = await Event.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email role')
      .lean();

    return res.status(200).json({
      events: items.map((e) => ({
        id: e._id.toString(),
        name: e.name,
        description: e.description,
        type: e.type,
        date: e.date,
        time: e.time,
        place: e.place,
        totalSeats: e.totalSeats,
        thumbnailUrl: e.thumbnailUrl,
        status: e.status,
        resubmission: e.resubmission || {},
        createdAt: e.createdAt,
        createdBy: e.createdBy
          ? {
              id: e.createdBy._id?.toString?.() || undefined,
              name: e.createdBy.name,
              email: e.createdBy.email,
              role: e.createdBy.role,
            }
          : null,
      })),
    });
  } catch (error) {
    logger.error('Error listing pending events', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listAllEventsForFaculty = async (req, res) => {
  try {
    const deny = requireApprover(req, res);
    if (deny) return;

    const items = await Event.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email role')
      .lean();

    return res.status(200).json({
      events: items.map((e) => ({
        id: e._id.toString(),
        name: e.name,
        description: e.description,
        type: e.type,
        date: e.date,
        time: e.time,
        place: e.place,
        totalSeats: e.totalSeats,
        thumbnailUrl: e.thumbnailUrl,
        status: e.status,
        createdAt: e.createdAt,
        createdBy: e.createdBy
          ? {
              id: e.createdBy._id?.toString?.() || undefined,
              name: e.createdBy.name,
              email: e.createdBy.email,
              role: e.createdBy.role,
            }
          : null,
        decision: e.decision
          ? {
              decidedBy: e.decision.decidedBy?.toString?.() || null,
              decidedAt: e.decision.decidedAt || null,
              rejectionReason: e.decision.rejectionReason || '',
            }
          : null,
      })),
    });
  } catch (error) {
    logger.error('Error listing faculty events', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listApprovedEvents = async (req, res) => {
  try {
    const items = await Event.find({ status: 'approved' })
      .sort({ date: 1, time: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      events: items.map((e) => ({
        id: e._id.toString(),
        name: e.name,
        description: e.description,
        type: e.type,
        date: e.date,
        time: e.time,
        place: e.place,
        totalSeats: e.totalSeats,
        thumbnailUrl: e.thumbnailUrl,
        status: e.status,
        resubmission: e.resubmission || {},
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing approved events', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const deny = requireStudent(req, res);
    if (deny) return;

    const eventId = req.params?.id;
    if (!eventId) {
      return res.status(400).json({ message: 'Event id is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const event = await Event.findById(eventId).lean();
    if (!event || event.status !== 'approved') {
      return res.status(404).json({ message: 'Approved event not found' });
    }

    const totalSeats = event.totalSeats || 0;
    if (!Number.isFinite(totalSeats) || totalSeats <= 0) {
      return res
        .status(400)
        .json({ message: 'Event does not have a valid seat count' });
    }

    const existing = await Registration.findOne({
      eventId: event._id,
      userId: req.user.id,
    }).lean();
    if (existing) {
      return res.status(409).json({ message: 'You are already registered' });
    }

    const currentCount = await Registration.countDocuments({
      eventId: event._id,
    });
    if (currentCount >= totalSeats) {
      return res
        .status(409)
        .json({ message: 'This event is fully booked. No seats available.' });
    }

    const reg = await Registration.create({
      eventId: event._id,
      userId: req.user.id,
      registeredAt: new Date(),
    });

    const newCount = currentCount + 1;

    logger.info('Student registered for event', {
      eventId: event._id.toString(),
      userId: req.user.id,
    });

    return res.status(201).json({
      message: 'Registered successfully',
      registration: {
        id: reg._id.toString(),
        eventId: reg.eventId.toString(),
        userId: reg.userId.toString(),
        registeredAt: reg.registeredAt,
      },
      registeredCount: newCount,
      totalSeats,
      remainingSeats: Math.max(0, totalSeats - newCount),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'You are already registered for this event' });
    }
    logger.error('Error registering for event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const approveEvent = async (req, res) => {
  try {
    const deny = requireApprover(req, res);
    if (deny) return;

    const eventId = req.params?.id;
    if (!eventId) return res.status(400).json({ message: 'Event id is required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const authz = await eventService.ensureRoleCanApprove(req.user.id, req.user.role, event);
    if (!authz.ok) return res.status(authz.status).json({ message: authz.message });

    if (event.status !== 'pending') {
      return res.status(409).json({
        message: `Only pending events can be approved. Current status: ${event.status}`,
      });
    }

    event.status = 'approved';
    event.decision = {
      decidedBy: req.user.id,
      decidedAt: new Date(),
      rejectionReason: '',
    };

    await event.save();
    await eventService.notifyApproved(event);

    return res.status(200).json({
      message: 'Event approved',
      event: {
        id: event._id.toString(),
        name: event.name,
        status: event.status,
        decision: {
          decidedBy: event.decision?.decidedBy?.toString?.() || null,
          decidedAt: event.decision?.decidedAt || null,
          rejectionReason: event.decision?.rejectionReason || '',
        },
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error approving event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const rejectEvent = async (req, res) => {
  try {
    const deny = requireApprover(req, res);
    if (deny) return;

    const eventId = req.params?.id;
    if (!eventId) return res.status(400).json({ message: 'Event id is required' });

    const reason = String(req.body?.rejectionReason || req.body?.reason || '').trim();

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const authz = await eventService.ensureRoleCanApprove(req.user.id, req.user.role, event);
    if (!authz.ok) return res.status(authz.status).json({ message: authz.message });

    if (event.status !== 'pending') {
      return res.status(409).json({
        message: `Only pending events can be rejected. Current status: ${event.status}`,
      });
    }

    event.status = 'rejected';
    event.decision = {
      decidedBy: req.user.id,
      decidedAt: new Date(),
      rejectionReason: reason,
    };

    await event.save();
    await eventService.notifyRejected(event, reason);

    return res.status(200).json({
      message: 'Event rejected',
      event: {
        id: event._id.toString(),
        name: event.name,
        status: event.status,
        decision: {
          decidedBy: event.decision?.decidedBy?.toString?.() || null,
          decidedAt: event.decision?.decidedAt || null,
          rejectionReason: event.decision?.rejectionReason || '',
        },
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error rejecting event', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getOrganizerOverview = async (req, res) => {
  try {
    const deny = requireOrganizer(req, res);
    if (deny) return;

    const organizerId = req.user.id;
    const events = await Event.find({ createdBy: organizerId }).lean();
    const totalEvents = events.length;

    const statusCounts = events.reduce(
      (acc, e) => {
        const key = e.status || 'pending';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { approved: 0, pending: 0, completed: 0, rejected: 0 }
    );

    const eventIds = events.map((e) => e._id);

    // Aggregate attendance (each QR scan = one attended)
    const attendanceAgg = await Attendance.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', scans: { $sum: 1 } } },
    ]);
    const scansByEventId = new Map(
      attendanceAgg.map((x) => [String(x._id), x.scans])
    );
    const totalAttendance = attendanceAgg.reduce(
      (sum, x) => sum + x.scans,
      0
    );

    // Aggregate registrations (students registered per event)
    const registrationsAgg = await Registration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', registrations: { $sum: 1 } } },
    ]);
    const registrationsByEventId = new Map(
      registrationsAgg.map((x) => [String(x._id), x.registrations])
    );
    const totalRegistrations = registrationsAgg.reduce(
      (sum, x) => sum + x.registrations,
      0
    );

    // Avg. attendance = total attended / total registrations (over all events)
    const avgAttendancePct =
      totalRegistrations === 0
        ? 0
        : Math.round((totalAttendance / totalRegistrations) * 100);

    const topEvents = [...events]
      .map((e) => ({
        id: String(e._id),
        name: e.name,
        scans: scansByEventId.get(String(e._id)) || 0,
        totalSeats: e.totalSeats || 0,
        registrations: registrationsByEventId.get(String(e._id)) || 0,
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 6);

    return res.status(200).json({
      stats: {
        totalEvents,
        approvedEvents: statusCounts.approved || 0,
        pendingApprovals: statusCounts.pending || 0,
        totalRegistrations,
        totalAttendance,
        avgAttendancePct,
      },
      statusDistribution: [
        { name: 'Approved', value: statusCounts.approved || 0 },
        { name: 'Pending', value: statusCounts.pending || 0 },
        { name: 'Completed', value: statusCounts.completed || 0 },
        { name: 'Rejected', value: statusCounts.rejected || 0 },
      ],
      topEvents,
    });
  } catch (error) {
    logger.error('Error building organizer overview', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getStudentRegistrations = async (req, res) => {
  try {
    const deny = requireStudentOrStaff(req, res);
    if (deny) return;

    const regs = await Registration.find({ userId: req.user.id })
      .populate('eventId')
      .lean();

    const events = regs
      .map((r) => r.eventId)
      .filter(Boolean)
      .map((e) => ({
        id: e._id.toString(),
        name: e.name,
        description: e.description,
        type: e.type,
        date: e.date,
        time: e.time,
        place: e.place,
        totalSeats: e.totalSeats,
        thumbnailUrl: e.thumbnailUrl,
        status: e.status,
        createdAt: e.createdAt,
      }));

    return res.status(200).json({ events });
  } catch (error) {
    logger.error('Error listing student registrations', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createLifecycleEvent,
  listLifecycleEvents,
  getLifecycleEvent,
  updateLifecycleEvent,
  cancelLifecycleEvent,
  deleteLifecycleEvent,
  createEvent,
  listMyEvents,
  listPendingEvents,
  listAllEventsForFaculty,
  listApprovedEvents,
  updateMyEvent,
  approveEvent,
  rejectEvent,
  checkInQr,
  getOrganizerOverview,
  registerForEvent,
  getStudentRegistrations,
};

