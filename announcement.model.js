const mongoose = require('mongoose')

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetRole: {
      type: String,
      enum: ['all', 'student', 'organizer', 'facultyCoordinator', 'admin'],
      default: 'all',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

const Announcement = mongoose.model('Announcement', announcementSchema)

module.exports = { Announcement }