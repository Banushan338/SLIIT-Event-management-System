const mongoose = require('mongoose');

const NOTIFICATION_TYPES = ['info', 'warning', 'success', 'error'];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Optional title for UI */
    title: {
      type: String,
      default: '',
      trim: true,
    },
    /** e.g. admin_update | role_change | status_change */
    category: {
      type: String,
      default: '',
      trim: true,
    },
    roleTarget: {
      type: String,
      default: '',
      trim: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  Notification,
  NOTIFICATION_TYPES,
};
