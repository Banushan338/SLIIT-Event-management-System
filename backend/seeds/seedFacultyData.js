const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Notification } = require('../models/notification.model');
const { logger } = require('../utils/logger');

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management';

const upsertNotificationByTitle = async (title, patch) => {
  return Notification.findOneAndUpdate(
    { targetRole: 'facultyCoordinator', title },
    { $set: { ...patch, targetRole: 'facultyCoordinator', title } },
    { upsert: true, returnDocument: 'after' }
  );
};

const seedFacultyData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB for seeding faculty data');

    const items = [
      {
        title: 'New event awaiting approval',
        message:
          'A new event has been submitted by an organizer. Please review it under Event Approvals.',
        read: false,
      },
      {
        title: 'Reminder: review pending approvals',
        message:
          'Pending events should be reviewed within 24 hours to keep schedules accurate.',
        read: false,
      },
      {
        title: 'Policy update: event safety checklist',
        message:
          'Ensure each sports event includes a safety plan and first-aid coverage details.',
        read: true,
      },
    ];

    let upserted = 0;
    for (const n of items) {
      await upsertNotificationByTitle(n.title, n);
      upserted += 1;
    }

    logger.info('Seed faculty done (upsert)', { upserted });

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB after seeding faculty data');
  } catch (error) {
    logger.error('Error seeding faculty data', { message: error.message });
    process.exit(1);
  }
};

seedFacultyData();

