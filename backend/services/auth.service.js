const bcrypt = require('bcrypt');
const { User } = require('../models/user.model');

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

  if (user.status && user.status !== 'active') {
    const err = new Error(
      user.status === 'suspended'
        ? 'Your account is suspended. Contact administrator.'
        : 'Your account is inactive. Contact administrator.',
    );
    err.statusCode = 403;
    throw err;
  }

  let isMatch = false;
  const storedPassword = String(user.password || '');
  const looksHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$');

  if (looksHashed) {
    isMatch = await bcrypt.compare(password, storedPassword);
  } else if (storedPassword) {
    // Support legacy plain-text records, then migrate immediately to bcrypt.
    isMatch = password === storedPassword;
    if (isMatch) {
      user.password = await bcrypt.hash(password, 10);
    }
  }

  if (!isMatch) {
    // Self-heal managed demo accounts to the expected credentials from the login table.
    if (isManagedAccount && password === defaultPassword) {
      user.password = await bcrypt.hash(password, 10);
      isMatch = true;
    } else {
      return null;
    }
  }

  if (forcedRole && user.role !== forcedRole) {
    user.role = forcedRole;
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
};
