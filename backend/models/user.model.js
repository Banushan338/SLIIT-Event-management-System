const mongoose = require('mongoose');

/** @typedef {'student'|'organizer'|'facultyCoordinator'|'admin'|'superAdmin'|'staff'} UserRole */
const USER_ROLES = ['student', 'organizer', 'facultyCoordinator', 'admin', 'superAdmin', 'staff'];

const USER_STATUS = ['active', 'inactive', 'suspended', 'locked'];

const notificationPreferencesSchema = new mongoose.Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
    eventNotifications: { type: Boolean, default: true },
    approvalNotifications: { type: Boolean, default: true },
    commentNotifications: { type: Boolean, default: true },
    moderationNotifications: { type: Boolean, default: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: USER_ROLES,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      line1: {
        type: String,
        default: '',
        trim: true,
      },
      city: {
        type: String,
        default: '',
        trim: true,
      },
      district: {
        type: String,
        default: '',
        trim: true,
      },
    },
    /** University department (faculty/staff/student context) */
    department: {
      type: String,
      default: '',
      trim: true,
    },
    /** Student registration number or staff / faculty ID */
    registrationNumber: {
      type: String,
      default: '',
      trim: true,
    },
    /** Optional staff/faculty specific identifier */
    staffId: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: USER_STATUS,
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    /** Consecutive failed password attempts (reset on success or admin unlock). */
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** When set and in the future, login is blocked (auto lockout). */
    lockUntil: {
      type: Date,
      default: null,
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    /**
     * Role-specific profile (admin may edit per target role):
     * organizer: { organizationName, experienceLevel }
     * facultyCoordinator: { designation }
     * staff: { position }
     * student: { course }
     */
    roleProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /** Public URL path served from /uploads (e.g. /uploads/profiles/abc.jpg) */
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpire: {
      type: Date,
      default: null,
    },
    passwordResetOtpHash: {
      type: String,
      default: null,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetLastSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ department: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  USER_ROLES,
  USER_STATUS,
};
