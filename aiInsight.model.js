const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    generatedFor: {
      type: String,
      enum: ['organizer', 'faculty', 'student', 'feedback', 'chat'],
      required: true,
    },
    payload: {
      type: Object,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
);

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);

module.exports = { AIInsight };