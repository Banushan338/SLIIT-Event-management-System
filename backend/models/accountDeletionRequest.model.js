const mongoose = require('mongoose');

const accountDeletionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000,
    },
    source: {
      type: String,
      enum: ['self-service', 'admin-delete'],
      default: 'self-service',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processed'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

accountDeletionRequestSchema.index({ userId: 1, status: 1, requestedAt: -1 });

const AccountDeletionRequest = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema);

module.exports = { AccountDeletionRequest };
