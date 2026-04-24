const mongoose = require('mongoose');

const COMMENT_VISIBILITY = ['PUBLIC', 'ADMIN_ONLY', 'ROLE_BASED'];
const ROLE_VALUES = [
  'student',
  'staff',
  'facultyCoordinator',
  'organizer',
  'admin',
  'superAdmin',
];

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    visibility: {
      type: String,
      enum: COMMENT_VISIBILITY,
      default: 'PUBLIC',
    },
    visibleRoles: {
      type: [String],
      enum: ROLE_VALUES,
      default: [],
    },
    isOverridden: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

commentSchema.index({ eventId: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = {
  Comment,
  COMMENT_VISIBILITY,
  ROLE_VALUES,
};
