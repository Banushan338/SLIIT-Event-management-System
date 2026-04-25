const mongoose = require('mongoose');

const EVENT_TYPES = ['academic', 'work', 'sports', 'social'];
const EVENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];

const decisionSchema = new mongoose.Schema(
  {
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', trim: true },
    /** Optional note from approver (shown to organizer) */
    approvalNote: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const resubmissionSchema = new mongoose.Schema(
  {
    wasRejectedBefore: { type: Boolean, default: false },
    previousRejectionReason: { type: String, default: '' },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    // Legacy field used across existing pages.
    name: { type: String, required: true, trim: true },
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    type: { type: String, required: true, enum: EVENT_TYPES },
    // Legacy date/time/location fields
    date: { type: Date, required: true },
    time: { type: String, required: true, trim: true },
    place: { type: String, required: true, trim: true },
    location: { type: String, default: '', trim: true },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: 60, min: 1 },
    totalSeats: { type: Number, required: true, min: 1 },
    thumbnailUrl: { type: String, default: '', trim: true },
    images: [{ type: String, trim: true }],
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: EVENT_STATUSES, default: 'pending' },
    decision: { type: decisionSchema, default: () => ({}) },
    resubmission: { type: resubmissionSchema, default: () => ({}) },
    cancellationReason: { type: String, default: '', trim: true },
    /** Soft delete (Recycle Bin) */
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, startTime: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ deletedAt: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event,
  EVENT_TYPES,
  EVENT_STATUSES,
};
