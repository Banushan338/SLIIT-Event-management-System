const mongoose = require('mongoose');

const EVENT_TYPES = ['academic', 'work', 'sports', 'social'];
const EVENT_STATUSES = ['pending', 'approved', 'rejected', 'completed'];

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    type: { type: String, required: true, enum: EVENT_TYPES },
    date: { type: Date, required: true },
    time: { type: String, required: true, trim: true },
    place: { type: String, required: true, trim: true },
    totalSeats: { type: Number, required: true, min: 1 },
    thumbnailUrl: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: EVENT_STATUSES, default: 'pending' },
    decision: {
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decidedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: '', trim: true },
    },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event,
  EVENT_TYPES,
  EVENT_STATUSES,
};

