/**
 * Computed event lifecycle (Upcoming / Ongoing / Completed) for approved or published events.
 * Workflow states (pending / rejected) are not overridden here — pass workflowStatus separately.
 */
function combineDateAndTime(dateInput, timeInput) {
  if (!dateInput || !timeInput) return null;
  const dateObj = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) return null;
  const hhmm = String(timeInput).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const next = new Date(dateObj);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return Number.isNaN(next.getTime()) ? null : next;
}

function resolveEndFromDuration(start, durationMinutes) {
  const mins = Number.parseInt(durationMinutes, 10);
  if (!start || !Number.isFinite(mins) || mins < 1) return null;
  return new Date(start.getTime() + mins * 60000);
}

function deriveLifecycleStatus(event, now = new Date()) {
  const current = String(event?.status || '').toLowerCase();
  // Preserve explicit workflow terminal states.
  if (current === 'completed') return 'completed';
  if (current === 'cancelled') return 'cancelled';
  if (['pending', 'rejected'].includes(current)) {
    return current === 'pending' ? 'pending' : 'rejected';
  }
  const start = event?.startTime
    ? new Date(event.startTime)
    : combineDateAndTime(event?.date, event?.time);
  const end = event?.endTime ? new Date(event.endTime) : null;
  if (!start || Number.isNaN(start.getTime())) return 'upcoming';
  if (end && Number.isNaN(end.getTime())) return 'upcoming';
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

module.exports = {
  combineDateAndTime,
  deriveLifecycleStatus,
  resolveEndFromDuration,
  resolveDurationMinutes,
};
