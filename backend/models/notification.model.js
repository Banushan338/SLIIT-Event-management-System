const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      required: true,
      enum: ['facultyCoordinator'],
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification };

