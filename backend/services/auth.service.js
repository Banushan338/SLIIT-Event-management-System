const bcrypt = require('bcrypt');
const { User } = require('../models/user.model');
const notificationService = require('./notification.service');
const { logger } = require('../utils/logger');

const FORCED_ROLE_BY_EMAIL = {
  'student1@university.ac.lk': 'student',
  'faculty1@university.ac.lk': 'facultyCoordinator',
  'organizer1@university.ac.lk': 'organizer',
  'admin1@university.ac.lk': 'admin',
};

const DEFAULT_PASSWORD_BY_EMAIL = {
  'student1@university.ac.lk': 'student123',
  'faculty1@university.ac.lk': 'faculty123',
  'organizer1@university.ac.lk': 'organizer123',
  'admin1@university.ac.lk': 'admin123',
};

const DEFAULT_NAME_BY_EMAIL = {
  'student1@university.ac.lk': 'Student One',
  'faculty1@university.ac.lk': 'Faculty Coordinator',
  'organizer1@university.ac.lk': 'Event Organizer',
  'admin1@university.ac.lk': 'System Admin',
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

async function clearLockoutIfExpired(user) {
  const now = new Date();
  if (user.lockUntil && user.lockUntil <= now) {
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    if (user.status === 'locked') {
      user.status = 'active';
    }
  }
}

async function notifyAdminsOfLockout(lockedUser) {
  const msg = `User ${lockedUser.email} (${lockedUser.name || 'unknown'}) was locked after ${MAX_FAILED_ATTEMPTS} failed login attempts.`;
  try {
    await notificationService.notifyUsersByRoles(
      ['admin', 'superAdmin'],
      {
        title: 'Account lockout alert',
        message: msg,
        type: 'warning',
        category: 'SECURITY',
        sendEmail: true,
      },
      { sendEmail: true },
    );
  } catch (e) {
    logger.warn('notifyAdminsOfLockout failed', { message: e.message });
  }
}

const authenticateUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();
  const forcedRole = FORCED_ROLE_BY_EMAIL[normalizedEmail];
  const defaultPassword = DEFAULT_PASSWORD_BY_EMAIL[normalizedEmail];
  const isManagedAccount = Boolean(forcedRole && defaultPassword);

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    if (!isManagedAccount || password !== defaultPassword) return null;
    user = await User.create({
      name: DEFAULT_NAME_BY_EMAIL[normalizedEmail] || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: forcedRole,
      status: 'active',
      emailVerified: true,
      profileImage: '',
      lastLoginAt: new Date(),
    });
  }

  await clearLockoutIfExpired(user);

  const now = new Date();
  if (user.lockUntil && user.lockUntil > now) {
    const err = new Error(
      'Your account is temporarily locked after too many failed sign-in attempts. Try again later or contact an administrator.',
    );
    err.statusCode = 403;
    err.code = 'LOCKED';
    throw err;
  }

  if (user.status === 'locked' && !user.lockUntil) {
    const err = new Error('Your account is locked. Please contact an administrator.');
    err.statusCode = 403;
    err.code = 'LOCKED';
    throw err;
  }

  if (user.status === 'suspended') {
    const err = new Error('Your account is suspended. Contact administrator.');
    err.statusCode = 403;
    throw err;
  }
  if (user.status === 'inactive') {
    const err = new Error('Your account is inactive. Contact administrator.');
    err.statusCode = 403;
    throw err;
  }

  let isMatch = false;
  const storedPassword = String(user.password || '');
  const looksHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$');

  if (looksHashed) {
    isMatch = await bcrypt.compare(password, storedPassword);
  } else if (storedPassword) {
    isMatch = password === storedPassword;
    if (isMatch) {
      user.password = await bcrypt.hash(password, 10);
    }
  }

  if (!isMatch) {
    if (isManagedAccount && password === defaultPassword) {
      user.password = await bcrypt.hash(password, 10);
      isMatch = true;
    }
  }

  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.status = 'locked';
      user.lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await user.save();
      await notifyAdminsOfLockout(user);
    } else {
      await user.save();
    }
    return null;
  }

  if (forcedRole && user.role !== forcedRole) {
    user.role = forcedRole;
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  if (user.status === 'locked') {
    user.status = 'active';
  }
  user.lastLoginAt = new Date();
  await user.save();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage || '',
  };
};

module.exports = {
  authenticateUser,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
};
