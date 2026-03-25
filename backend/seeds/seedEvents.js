const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User } = require('../models/user.model');
const { Event } = require('../models/event.model');
const { logger } = require('../utils/logger');

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management';

const addDays = (baseDate, days) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
};

const upsertEventByName = async (name, patch) => {
  return Event.findOneAndUpdate(
    { name },
    { $set: { ...patch } },
    { upsert: true, returnDocument: 'after' }
  );
};

const seedEvents = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB for seeding events');

    const organizer = await User.findOne({ role: 'organizer' }).lean();
    const faculty = await User.findOne({ role: 'facultyCoordinator' }).lean();

    if (!organizer) {
      logger.error('No organizer user found. Run: npm run seed:users first.');
      await mongoose.disconnect();
      process.exit(1);
    }

    const now = new Date();
    const facultyId = faculty?._id || null;
    const decidedBy = facultyId || organizer._id;

    const demoEvents = [
      {
        name: 'AI Workshop 2026',
        patch: {
          description:
            'Hands-on workshop exploring modern AI tools and best practices.',
          type: 'work',
          date: addDays(now, 15),
          time: '10:00',
          place: 'Innovation Lab',
          totalSeats: 180,
          thumbnailUrl:
            'https://images.unsplash.com/photo-1526378722445-7b3f2d79b3be?auto=format&fit=crop&w=1200&q=60',
          createdBy: organizer._id,
          status: 'pending',
          decision: { decidedBy: null, decidedAt: null, rejectionReason: '' },
        },
      },
      {
        name: 'Research Symposium',
        patch: {
          description: 'Showcase of the latest projects from students and staff.',
          type: 'academic',
          date: addDays(now, 28),
          time: '13:00',
          place: 'Conference Hall B',
          totalSeats: 120,
          thumbnailUrl:
            'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=60',
          createdBy: organizer._id,
          status: 'approved',
          decision: {
            decidedBy,
            decidedAt: addDays(now, -2),
            rejectionReason: '',
          },
        },
      },
      {
        name: 'Annual Sports Meet',
        patch: {
          description: 'Inter-faculty sports meet with athletics and team events.',
          type: 'sports',
          date: addDays(now, 22),
          time: '08:30',
          place: 'Main Ground',
          totalSeats: 500,
          thumbnailUrl:
            'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
          createdBy: organizer._id,
          status: 'rejected',
          decision: {
            decidedBy,
            decidedAt: addDays(now, -1),
            rejectionReason:
              'Please attach the safety plan and first-aid coverage details.',
          },
        },
      },
      {
        name: 'Career Fair 2026',
        patch: {
          description: 'Meet recruiters, attend talks, and explore internships.',
          type: 'social',
          date: addDays(now, 35),
          time: '09:30',
          place: 'Main Auditorium',
          totalSeats: 900,
          thumbnailUrl:
            'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1200&q=60',
          createdBy: organizer._id,
          status: 'completed',
          decision: {
            decidedBy,
            decidedAt: addDays(now, -10),
            rejectionReason: '',
          },
        },
      },
      {
        name: 'Freshers Social Night',
        patch: {
          description: 'Welcome night with networking, games, and live music.',
          type: 'social',
          date: addDays(now, 10),
          time: '18:30',
          place: 'Student Center',
          totalSeats: 300,
          thumbnailUrl:
            'https://images.unsplash.com/photo-1515165562835-c3b8c8c6e1f0?auto=format&fit=crop&w=1200&q=60',
          createdBy: organizer._id,
          status: 'pending',
          decision: { decidedBy: null, decidedAt: null, rejectionReason: '' },
        },
      },
      {
        name: 'Inter-Faculty Coding Sprint',
        patch: {
          description:
            'Team-based sprint focusing on problem-solving and rapid prototyping.',
          type: 'academic',
          date: addDays(now, 18),
          time: '09:00',
          place: 'Computing Lab 2',
          totalSeats: 140,
          thumbnailUrl:
            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=60',
          createdBy: organizer._id,
          status: 'pending',
          decision: { decidedBy: null, decidedAt: null, rejectionReason: '' },
        },
      },
    ];

    let upserted = 0;
    for (const item of demoEvents) {
      await upsertEventByName(item.name, item.patch);
      upserted += 1;
    }

    logger.info('Seed events done (upsert)', { upserted });

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB after seeding events');
  } catch (error) {
    logger.error('Error seeding events', { message: error.message });
    process.exit(1);
  }
};

seedEvents();

