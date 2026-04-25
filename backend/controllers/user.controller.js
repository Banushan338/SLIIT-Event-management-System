/**
 * User profile CRUD (password updates use /api/auth/change-password).
 */
const { User } = require('../models/user.model');
const { logger } = require('../utils/logger');

function sanitizeText(value, max = 250) {
  return String(value || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, max);
}

function isValidPhone(value) {
  const v = String(value || '').trim();
  if (!v) return true;
  return /^\+?[0-9\s\-()]{7,20}$/.test(v);
}

function toPublicUser(doc) {
  const prefs = doc.notificationPreferences || {};
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone || '',
    address: {
      line1: doc.address?.line1 || '',
      city: doc.address?.city || '',
      district: doc.address?.district || '',
    },
    department: doc.department || '',
    registrationNumber: doc.registrationNumber || '',
    staffId: doc.staffId || '',
    status: doc.status || 'active',
    profileImage: doc.profileImage || '',
    bio: doc.bio || '',
    emailVerified: Boolean(doc.emailVerified),
    lastLoginAt: doc.lastLoginAt || null,
    roleProfile: doc.roleProfile && typeof doc.roleProfile === 'object' ? doc.roleProfile : {},
    notificationPreferences: {
      email: prefs.email !== false,
      sms: Boolean(prefs.sms),
      inApp: prefs.inApp !== false,
      eventNotifications: prefs.eventNotifications !== false,
      approvalNotifications: prefs.approvalNotifications !== false,
      commentNotifications: prefs.commentNotifications !== false,
      moderationNotifications: prefs.moderationNotifications !== false,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    logger.error('getProfile', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      department,
      registrationNumber,
      bio,
      roleProfile,
    } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof email === 'string' && email.trim().toLowerCase() !== user.email) {
      return res.status(400).json({ message: 'Email cannot be modified' });
    }

    if (typeof name === 'string' && name.trim()) {
      user.name = sanitizeText(name, 120);
    }

    if (typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      user.phone = sanitizeText(phone, 30);
    }

    if (address && typeof address === 'object') {
      user.address = {
        line1: sanitizeText(address.line1, 180),
        city: sanitizeText(address.city, 80),
        district: sanitizeText(address.district, 80),
      };
    }

    if (typeof department === 'string') {
      user.department = sanitizeText(department, 120);
    }

    if (typeof registrationNumber === 'string') {
      user.registrationNumber = sanitizeText(registrationNumber, 60);
    }

    if (typeof bio === 'string') {
      user.bio = sanitizeText(bio, 500);
    }

    if (roleProfile && typeof roleProfile === 'object') {
      user.roleProfile = {
        ...(user.roleProfile || {}),
        course: sanitizeText(roleProfile.course, 120),
        organizationName: sanitizeText(roleProfile.organizationName, 140),
        experienceLevel: sanitizeText(roleProfile.experienceLevel, 60),
        designation: sanitizeText(roleProfile.designation, 100),
      };
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated',
      user: toPublicUser(user),
    });
  } catch (error) {
    logger.error('updateProfile', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** After multer — single file field `image` */
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required (field name: image)' });
    }

    const publicPath = `/uploads/profiles/${req.file.filename}`;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profileImage = publicPath;
    await user.save();

    return res.status(200).json({
      message: 'Profile image updated',
      profileImage: publicPath,
      user: toPublicUser(user),
    });
  } catch (error) {
    logger.error('uploadProfileImage', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
};
