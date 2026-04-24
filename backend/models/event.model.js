const mongoose = require('mongoose');

const EVENT_TYPES = ['academic', 'work', 'sports', 'social'];
const EVENT_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
];

const eventSchema = new mongoose.Schema(
  {
    // Legacy field used across existing pages.
    name: { type: String, required: true, trim: true },
    // New centralized event module field; mirrors name for compatibility.
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    type: { type: String, required: true, enum: EVENT_TYPES },
    // Legacy date/time/location fields
    date: { type: Date, required: true },
    time: { type: String, required: true, trim: true },
    place: { type: String, required: true, trim: true },
    // New lifecycle-based fields
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: 60, min: 1 },
    location: { type: String, default: '', trim: true },
    totalSeats: { type: Number, required: true, min: 1 },
    thumbnailUrl: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: EVENT_STATUSES, default: 'pending' },
    cancellationReason: { type: String, default: '', trim: true },
    decision: {
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decidedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: '', trim: true },
    },
    resubmission: {
      wasRejectedBefore: { type: Boolean, default: false },
      previousRejectionReason: { type: String, default: '', trim: true },
      requestedReapproval: { type: Boolean, default: false },
      resubmittedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

eventSchema.pre('validate', function syncCompatibility(next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;
  if (!this.location && this.place) this.location = this.place;
  if (!this.place && this.location) this.place = this.location;
  if (!this.organizerId && this.createdBy) this.organizerId = this.createdBy;
  if (!this.createdBy && this.organizerId) this.createdBy = this.organizerId;
  next();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event,
  EVENT_TYPES,
  EVENT_STATUSES,
};

