const bcrypt = require('bcrypt');
const { User, USER_ROLES } = require('../models/user.model');
const { EventFeedback } = require('../models/eventFeedback.model');
const { AuditLog } = require('../models/auditLog.model');
const notificationService = require('../services/notification.service');
const { logger } = require('../utils/logger');
const {
  canAssignRole,
  canManageTarget,
} = require('../utils/rbac');

const generateRandomPassword = (length = 8) => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';

  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  
  return password;
};

const STATUS_VALUES = ['active', 'inactive', 'suspended'];

function toPublicUser(u) {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || 'active',
    department: u.department || '',
    phone: u.phone || '',
    registrationNumber: u.registrationNumber || '',
    staffId: u.staffId || '',
    profileImage: u.profileImage || '',
    emailVerified: Boolean(u.emailVerified),
    lastLoginAt: u.lastLoginAt || null,
    roleProfile: u.roleProfile || {},
    notificationPreferences: u.notificationPreferences || {},
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function deny(res, status, message) {
  return res.status(status).json({ message });
}

const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, role, password } = req.body || {};
    const actorRole = req.user?.role;

    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ message: 'Name, email and role are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Allowed: ${USER_ROLES.join(', ')}`,
      });
    }
    if (!canAssignRole(actorRole, role)) {
      return deny(res, 403, 'You are not allowed to assign this role');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: 'A user with this email already exists' });
    }

    const plainPassword =
      typeof password === 'string' && password.trim()
        ? password.trim()
        : generateRandomPassword(8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      role,
      password: hashedPassword,
      status: 'active',
    });

    logger.info('Admin created a new user with generated password', {
      createdUserId: user._id.toString(),
      email: user.email,
      role: user.role,
      generatedPassword: plainPassword,
    });

    return res.status(201).json({
      message: 'User created successfully',
      generatedPassword: plainPassword,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error creating user by admin', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { role, status, department, q } = req.query || {};
    const andParts = [];

    if (role && USER_ROLES.includes(role)) {
      andParts.push({ role });
    }
    if (status && STATUS_VALUES.includes(status)) {
      andParts.push({ status });
    }
    if (department && String(department).trim()) {
      andParts.push({ department: new RegExp(String(department).trim(), 'i') });
    }

    const search = typeof q === 'string' ? q.trim() : '';
    if (search) {
      andParts.push({
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { registrationNumber: new RegExp(search, 'i') },
        ],
      });
    }

    const filter =
      andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0] : { $and: andParts };

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select(
        'name email role status department phone registrationNumber staffId address bio profileImage createdAt updatedAt lastLoginAt emailVerified roleProfile notificationPreferences',
      )
      .lean();

    return res.status(200).json({
      users: (users || []).map(toPublicUser),
    });
  } catch (error) {
    logger.error('Error listing users', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    const targetId = req.params?.id;
    const actorRole = req.user?.role;
    const actorId = String(req.user?.id || '');
    if (!targetId) {
      return res.status(400).json({ message: 'User id is required' });
    }

    const target = await User.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!canManageTarget(actorRole, target.role) && actorId !== String(target._id)) {
      return deny(res, 403, 'You are not allowed to manage this user');
    }

    const body = req.body || {};
    const changes = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      const next = body.name.trim();
      if (next !== target.name) {
        changes.name = { from: target.name, to: next };
        target.name = next;
      }
    }

    if (body.role && USER_ROLES.includes(body.role) && body.role !== target.role) {
      if (!canAssignRole(actorRole, body.role)) {
        return deny(res, 403, 'You are not allowed to assign this role');
      }
      if (actorId === String(target._id) && ['admin', 'superAdmin'].includes(target.role)) {
        return deny(res, 403, 'You cannot remove your own admin privileges');
      }
      changes.role = { from: target.role, to: body.role };
      target.role = body.role;
    }

    if (body.status && STATUS_VALUES.includes(body.status)) {
      if (body.status !== target.status) {
        changes.status = { from: target.status || 'active', to: body.status };
        target.status = body.status;
      }
    }

    if (typeof body.phone === 'string') {
      const next = body.phone.trim();
      if (next !== (target.phone || '')) {
        changes.phone = { from: target.phone || '', to: next };
        target.phone = next;
      }
    }

    if (typeof body.department === 'string') {
      const next = body.department.trim();
      if (next !== (target.department || '')) {
        changes.department = { from: target.department || '', to: next };
        target.department = next;
      }
    }

    if (typeof body.registrationNumber === 'string') {
      const next = body.registrationNumber.trim();
      if (next !== (target.registrationNumber || '')) {
        changes.registrationNumber = {
          from: target.registrationNumber || '',
          to: next,
        };
        target.registrationNumber = next;
      }
    }
    if (typeof body.staffId === 'string') {
      const next = body.staffId.trim();
      if (next !== (target.staffId || '')) {
        changes.staffId = { from: target.staffId || '', to: next };
        target.staffId = next;
      }
    }
    if (typeof body.bio === 'string') {
      const next = body.bio.trim();
      if (next !== (target.bio || '')) {
        changes.bio = { from: target.bio || '', to: next };
        target.bio = next;
      }
    }
    if (body.address && typeof body.address === 'object') {
      const nextAddress = {
        line1: String(body.address.line1 || '').trim(),
        city: String(body.address.city || '').trim(),
        district: String(body.address.district || '').trim(),
      };
      const prevAddress = target.address || {};
      if (
        nextAddress.line1 !== String(prevAddress.line1 || '') ||
        nextAddress.city !== String(prevAddress.city || '') ||
        nextAddress.district !== String(prevAddress.district || '')
      ) {
        changes.address = { from: prevAddress, to: nextAddress };
        target.address = nextAddress;
      }
    }

    if (body.roleProfile && typeof body.roleProfile === 'object') {
      changes.roleProfile = { from: target.roleProfile || {}, to: body.roleProfile };
      target.roleProfile = { ...(target.roleProfile || {}), ...body.roleProfile };
    }

    if (typeof body.emailVerified === 'boolean') {
      changes.emailVerified = { from: target.emailVerified, to: body.emailVerified };
      target.emailVerified = body.emailVerified;
    }

    if (typeof body.password === 'string' && body.password.trim().length >= 6) {
      changes.password = { from: '[redacted]', to: '[updated]' };
      target.password = await bcrypt.hash(body.password.trim(), 10);
    }

    await target.save();

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        actorId: req.user.id,
        targetUserId: target._id,
        action: 'user_update',
        changes,
        ip: req.ip || '',
      });

      const parts = Object.keys(changes);
      await notificationService.notifyUser(target._id, {
        title: 'Account updated',
        message: `An administrator updated your account (${parts.join(', ')}). If this was not expected, contact support.`,
        type: 'info',
        category: 'admin_update',
        sendEmail: true,
      });
    }

    const u = target.toObject();
    delete u.password;

    return res.status(200).json({
      message: 'User updated',
      user: toPublicUser(u),
    });
  } catch (error) {
    logger.error('Error updating user by admin', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const targetId = req.params?.id;
    const nextRole = String(req.body?.role || '').trim();
    const actorRole = req.user?.role;
    const actorId = String(req.user?.id || '');

    if (!targetId) return deny(res, 400, 'User id is required');
    if (!USER_ROLES.includes(nextRole)) {
      return deny(res, 400, `Invalid role. Allowed: ${USER_ROLES.join(', ')}`);
    }

    const target = await User.findById(targetId);
    if (!target) return deny(res, 404, 'User not found');
    if (!canManageTarget(actorRole, target.role)) {
      return deny(res, 403, 'You are not allowed to manage this user');
    }
    if (!canAssignRole(actorRole, nextRole)) {
      return deny(res, 403, 'You are not allowed to assign this role');
    }
    if (actorId === String(target._id) && ['admin', 'superAdmin'].includes(target.role)) {
      return deny(res, 403, 'You cannot remove your own admin privileges');
    }
    if (target.role === nextRole) {
      return res.status(200).json({ message: 'Role unchanged', user: toPublicUser(target) });
    }

    const previousRole = target.role;
    target.role = nextRole;
    await target.save();

    await AuditLog.create({
      actorId: req.user.id,
      targetUserId: target._id,
      action: 'UPDATE_ROLE',
      changes: { role: { from: previousRole, to: nextRole } },
      ip: req.ip || '',
    });

    await notificationService.notifyUser(target._id, {
      title: 'Role updated',
      message: `Your role was changed from ${previousRole} to ${nextRole}.`,
      type: 'info',
      category: 'role_change',
      sendEmail: true,
    });

    return res.status(200).json({ message: 'Role updated', user: toPublicUser(target) });
  } catch (error) {
    logger.error('changeUserRole', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const targetId = req.params?.id;
    const nextStatus = String(req.body?.status || '').trim();
    const actorRole = req.user?.role;

    if (!targetId) return deny(res, 400, 'User id is required');
    if (!STATUS_VALUES.includes(nextStatus)) {
      return deny(res, 400, 'Invalid status');
    }

    const target = await User.findById(targetId);
    if (!target) return deny(res, 404, 'User not found');
    if (!canManageTarget(actorRole, target.role)) {
      return deny(res, 403, 'You are not allowed to manage this user');
    }
    if (target.status === nextStatus) {
      return res.status(200).json({ message: 'Status unchanged', user: toPublicUser(target) });
    }

    const previousStatus = target.status || 'active';
    target.status = nextStatus;
    await target.save();

    await AuditLog.create({
      actorId: req.user.id,
      targetUserId: target._id,
      action: 'STATUS_CHANGE',
      changes: { status: { from: previousStatus, to: nextStatus } },
      ip: req.ip || '',
    });
    await notificationService.notifyUser(target._id, {
      title: 'Account status changed',
      message: `Your account status changed from ${previousStatus} to ${nextStatus}.`,
      type: nextStatus === 'active' ? 'success' : 'warning',
      category: 'status_change',
      sendEmail: true,
    });

    return res.status(200).json({ message: 'Status updated', user: toPublicUser(target) });
  } catch (error) {
    logger.error('changeUserStatus', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteUserByAdmin = async (req, res) => {
  try {
    const targetId = req.params?.id;
    const actorRole = req.user?.role;
    const actorId = String(req.user?.id || '');
    if (!targetId) return deny(res, 400, 'User id is required');
    if (targetId === actorId) return deny(res, 403, 'You cannot delete your own account');

    const target = await User.findById(targetId);
    if (!target) return deny(res, 404, 'User not found');
    if (target.role === 'superAdmin') return deny(res, 403, 'Super admin cannot be deleted');
    if (!canManageTarget(actorRole, target.role)) {
      return deny(res, 403, 'You are not allowed to delete this user');
    }
    if (actorRole === 'admin' && target.role === 'admin') {
      return deny(res, 403, 'Admin cannot delete other admins');
    }

    await User.deleteOne({ _id: target._id });
    await AuditLog.create({
      actorId: req.user.id,
      targetUserId: target._id,
      action: 'DELETE_USER',
      changes: { deleted: true, snapshot: toPublicUser(target) },
      ip: req.ip || '',
    });

    return res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    logger.error('deleteUserByAdmin', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listAllFeedbacks = async (req, res) => {
  try {
    const rows = await EventFeedback.find({})
      .populate('userId', 'name email')
      .populate('eventId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      feedbacks: rows.map((row) => ({
        id: row._id.toString(),
        rating: row.rating,
        comment: row.comment ?? '',
        createdAt: row.createdAt,
        student: row.userId
          ? {
              id: row.userId._id.toString(),
              name: row.userId.name,
              email: row.userId.email,
            }
          : null,
        event: row.eventId
          ? {
              id: row.eventId._id.toString(),
              name: row.eventId.name,
            }
          : null,
      })),
    });
  } catch (error) {
    logger.error('Error listing feedbacks for admin', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!id) {
      return res.status(400).json({ message: 'Feedback id is required' });
    }

    const deleted = await EventFeedback.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    logger.info('Admin deleted event feedback', {
      feedbackId: id,
      adminId: req.user?.id,
    });

    return res.status(200).json({ message: 'Feedback deleted' });
  } catch (error) {
    logger.error('Error deleting feedback', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const uploadUserImageByAdmin = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required (field name: image)' });
    }
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }
    const publicPath = `/uploads/profiles/${req.file.filename}`;
    const prev = target.profileImage || '';
    target.profileImage = publicPath;
    await target.save();

    await AuditLog.create({
      actorId: req.user.id,
      targetUserId: target._id,
      action: 'profile_image_update',
      changes: { profileImage: { from: prev, to: publicPath } },
      ip: req.ip || '',
    });

    await notificationService.notifyUser(target._id, {
      title: 'Profile photo updated',
      message: 'An administrator updated your profile image.',
      type: 'info',
      category: 'admin_update',
      sendEmail: false,
    });

    return res.status(200).json({
      message: 'Profile image updated',
      profileImage: publicPath,
      user: {
        id: target._id.toString(),
        name: target.name,
        email: target.email,
        profileImage: target.profileImage,
      },
    });
  } catch (error) {
    logger.error('uploadUserImageByAdmin', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actorId', 'name email')
      .populate('targetUserId', 'name email')
      .lean();

    return res.status(200).json({
      logs: rows.map((row) => ({
        id: row._id.toString(),
        action: row.action,
        changes: row.changes || {},
        createdAt: row.createdAt,
        actor: row.actorId
          ? { id: row.actorId._id.toString(), name: row.actorId.name, email: row.actorId.email }
          : null,
        target: row.targetUserId
          ? {
              id: row.targetUserId._id.toString(),
              name: row.targetUserId.name,
              email: row.targetUserId.email,
            }
          : null,
      })),
    });
  } catch (error) {
    logger.error('listAuditLogs', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createUserByAdmin,
  listUsers,
  updateUserByAdmin,
  changeUserRole,
  changeUserStatus,
  deleteUserByAdmin,
  uploadUserImageByAdmin,
  listAuditLogs,
  listAllFeedbacks,
  deleteFeedback,
};

