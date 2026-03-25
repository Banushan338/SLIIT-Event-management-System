const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { User } = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret';
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// In-memory blacklist for invalidated tokens (e.g. after logout)
// token -> unix ms when the blacklist entry expires
const tokenBlacklist = new Map();

const ONE_HOUR_MS = 60 * 60 * 1000;

const cleanupBlacklist = () => {
  const now = Date.now();
  for (const [token, expiresAt] of tokenBlacklist.entries()) {
    if (expiresAt <= now) {
      tokenBlacklist.delete(token);
    }
  }
};

const addToBlacklist = (token, ttlMs) => {
  if (!token) return;
  const expiresAt = Date.now() + ttlMs;
  tokenBlacklist.set(token, expiresAt);
  cleanupBlacklist();
};

const isBlacklisted = (token) => {
  if (!token) return false;
  const expiresAt = tokenBlacklist.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    tokenBlacklist.delete(token);
    return false;
  }
  return true;
};

const issueJwt = (req, res) => {
  const user = req.authUser;

  if (!user) {
    logger.error('issueJwt called without authUser on request');
    return res.status(500).json({ message: 'Authentication state not found' });
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { sub: user.id, tokenType: 'refresh' },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );

  logger.info('JWTs issued for user', { email: user.email, role: user.role });

  return res.status(200).json({
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token: accessToken,
    refreshToken,
  });
};

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    if (isBlacklisted(token)) {
      logger.warn('Attempt to use blacklisted access token');
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    logger.warn('Access token verification failed', { message: error.message });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const refreshAccessToken = (req, res) => {
  try {
    const refreshToken =
      req.body?.refreshToken || req.headers['x-refresh-token'];

    if (!refreshToken) {
      return res
        .status(400)
        .json({ message: 'Refresh token is required' });
    }

    if (isBlacklisted(refreshToken)) {
      logger.warn('Attempt to use blacklisted refresh token');
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    if (decoded.tokenType !== 'refresh') {
      return res.status(400).json({ message: 'Invalid refresh token' });
    }

    return User.findById(decoded.sub)
      .then((user) => {
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        const payload = {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, {
          expiresIn: JWT_EXPIRES_IN,
        });

        logger.info('Access token refreshed', { sub: decoded.sub });

        return res.status(200).json({
          message: 'Access token refreshed',
          token: accessToken,
        });
      })
      .catch((err) => {
        logger.warn('Refresh user lookup failed', { message: err.message });
        return res.status(401).json({ message: 'Invalid refresh token' });
      });
  } catch (error) {
    logger.warn('Refresh token verification failed', { message: error.message });
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

const requireAdmin = (req, res, next) => {
  const user = req.user;

  if (!user || user.role !== 'admin') {
    logger.warn('Non-admin user attempted to access admin-only route', {
      userId: user?.id,
      role: user?.role,
    });
    return res.status(403).json({ message: 'Admin access required' });
  }

  return next();
};

const requireFacultyCoordinator = (req, res, next) => {
  const user = req.user;

  if (!user || user.role !== 'facultyCoordinator') {
    logger.warn('Non-facultyCoordinator attempted to access coordinator route', {
      userId: user?.id,
      role: user?.role,
    });
    return res.status(403).json({ message: 'Faculty coordinator access required' });
  }

  return next();
};

const logout = (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [, accessToken] = authHeader.split(' ');

    const refreshToken =
      req.body?.refreshToken || req.headers['x-refresh-token'];

    // Blacklist both tokens for at least 1 hour.
    addToBlacklist(accessToken, ONE_HOUR_MS);
    addToBlacklist(refreshToken, ONE_HOUR_MS);

    logger.info('User logged out and tokens blacklisted for 1 hour');

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error during logout', { message: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  issueJwt,
  authenticate,
  requireAdmin,
  requireFacultyCoordinator,
  refreshAccessToken,
  logout,
};

