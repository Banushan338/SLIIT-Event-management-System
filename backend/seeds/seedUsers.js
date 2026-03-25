const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { User } = require('../models/user.model');
const { logger } = require('../utils/logger');

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management';

const upsertUserByEmail = async ({ email, password, name, role }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).lean();

  const overwriteExistingUsers =
    process.env.SEED_OVERWRITE_EXISTING_USERS === 'true';

  if (existing) {
    if (!overwriteExistingUsers) {
      // Skip existing users (do not overwrite password).
      return { action: 'skipped', email: normalizedEmail };
    }

    // Overwrite password + profile fields for deterministic dev seeding.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await User.updateOne(
      { email: normalizedEmail },
      { $set: { password: hashedPassword, name, role } },
    );
    return { action: 'updated', email: normalizedEmail };
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    name,
    role,
  });
  return { action: 'inserted', email: normalizedEmail };
};

const seedUsers = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB for seeding users');

    const plainUsers = [
      {
        email: 'student1@university.ac.lk',
        password: 'student123',
        name: 'Student One',
        role: 'student',
      },
      {
        email: 'faculty1@university.ac.lk',
        password: 'faculty123',
        name: 'Faculty Coordinator',
        role: 'facultyCoordinator',
      },
      {
        email: 'organizer1@university.ac.lk',
        password: 'organizer123',
        name: 'Event Organizer',
        role: 'organizer',
      },
      {
        email: 'admin1@university.ac.lk',
        password: 'admin123',
        name: 'System Admin',
        role: 'admin',
      },
    ];

    let inserted = 0;
    let skipped = 0;
    let updated = 0;
    for (const u of plainUsers) {
      const result = await upsertUserByEmail(u);
      if (result.action === 'inserted') inserted += 1;
      else skipped += 1;
      if (result.action === 'updated') updated += 1;
    }

    logger.info('Seed users done', { inserted, skipped, updated });

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB after seeding users');
  } catch (error) {
    logger.error('Error seeding users', { message: error.message });
    process.exit(1);
  }
};

seedUsers();

