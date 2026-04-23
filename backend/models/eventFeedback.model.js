const mongoose = require('mongoose');

const eventFeedbackSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  { timestamps: true }
);

eventFeedbackSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventFeedback = mongoose.model('EventFeedback', eventFeedbackSchema);

module.exports = { EventFeedback };
