const { authenticateUser } = require('../services/auth.service');
const { sendPasswordResetEmail } = require('../services/email.service');
const { logger } = require('../utils/logger');
const bcrypt = require('bcrypt');
const { User } = require('../models/user.model');
const { generateSecureToken, hashToken } = require('../utils/cryptoToken');

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const clearPasswordResetFields = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  // keep passwordResetLastSentAt for rate-limit context; clear on successful reset
  user.passwordResetLastSentAt = null;
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    if (!name?.trim() || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Password and confirm password do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'student',
      profileImage: '',
    });

    req.authUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || '',
    };
    req.authSuccessMessage = 'Registration successful';
    req.authHttpStatus = 201;

    logger.info('User registered', { email: user.email });

    return next();
  } catch (error) {
    logger.error('Error during register', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    
    if (!email || !password) {
      logger.warn('Login attempt with missing credentials', { email });
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      logger.warn('Invalid login attempt', { email });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.authUser = user;

    logger.info('User authenticated successfully', {
      email: user.email,
      role: user.role,
    });

    return next();
  } catch (error) {
    logger.error('Error during login', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { oldPassword, newPassword, confirmPassword } = req.body || {};

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Old password, new password, and confirm password are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: 'New password and confirm password do not match' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOldMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isOldMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    logger.info('Password changed successfully', { userId });
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error during changePassword', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Production-style reset: crypto token + email link (POST /api/auth/forgot-password).
 * Does not reveal whether the email exists (always 200 when body is valid).
 */
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawToken = generateSecureToken(32);
      user.resetToken = hashToken(rawToken);
      user.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const base =
        process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:5173';
      const resetUrl = `${base}/reset-password/${rawToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);

      logger.info('Password reset token issued', { email: user.email });
      // eslint-disable-next-line no-console
      console.log(
        `\n========== PASSWORD RESET LINK (dev) ==========\nEmail: ${user.email}\n${resetUrl}\n================================================\n`,
      );
    }

    return res.status(200).json({
      message:
        'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Error during forgotPassword', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** Legacy OTP flow for existing clients (dev-friendly). */
const forgotPasswordOtp = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const now = Date.now();
    if (
      user.passwordResetLastSentAt &&
      now - user.passwordResetLastSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - user.passwordResetLastSentAt.getTime())) /
          1000,
      );
      return res.status(429).json({
        message: 'Please wait before requesting another code',
        retryAfterSeconds,
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = new Date(now + OTP_EXPIRY_MS);
    user.passwordResetLastSentAt = new Date(now);
    await user.save();

    logger.info('Password reset OTP (dev: also printed for support)', {
      email: user.email,
      role: user.role,
      otp,
    });
    // eslint-disable-next-line no-console
    console.log(
      `\n========== PASSWORD RESET OTP ==========\nEmail: ${user.email}\nOTP: ${otp}\nExpires in: 5 minutes\n========================================\n`,
    );

    const expiresAt = user.passwordResetOtpExpiresAt.toISOString();
    const resendAvailableAt = new Date(now + RESEND_COOLDOWN_MS).toISOString();

    return res.status(200).json({
      message: 'Verification code sent. Check the server terminal for the OTP in development.',
      expiresAt,
      resendAvailableAt,
      otpExpiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000),
    });
  } catch (error) {
    logger.error('Error during forgotPasswordOtp', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resetPasswordWithToken = async (req, res) => {
  try {
    const rawToken = (req.params?.token || '').trim();
    const { newPassword, confirmPassword } = req.body || {};

    if (!rawToken) {
      return res.status(400).json({ message: 'Reset token is required' });
    }
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      resetToken: tokenHash,
      resetTokenExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpire = null;
    clearPasswordResetFields(user);
    await user.save();

    logger.info('Password reset via token completed', { email: user.email });
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error during resetPasswordWithToken', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const otp = (req.body?.otp || '').trim();
    const { newPassword, confirmPassword } = req.body || {};

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Email, OTP, new password, and confirm password are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: 'New password and confirm password do not match' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordResetOtpHash) {
      return res.status(400).json({
        message: 'Invalid or expired verification code. Request a new code.',
      });
    }

    if (
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: 'Verification code has expired. Request a new code.',
      });
    }

    const otpOk = await bcrypt.compare(otp, user.passwordResetOtpHash);
    if (!otpOk) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    clearPasswordResetFields(user);
    await user.save();

    logger.info('Password reset via OTP completed', { email: user.email });
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error during resetPasswordWithOtp', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  changePassword,
  forgotPassword,
  forgotPasswordOtp,
  resetPasswordWithToken,
  resetPasswordWithOtp,
};

