const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { User } = require('../models/user.model');
const { logger } = require('../utils/logger');
const { createTokenPairForUser } = require('../middleware/auth.middleware');

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const oauthState = new Map();

function cleanupOAuthState() {
  const now = Date.now();
  for (const [key, meta] of oauthState.entries()) {
    if (now - meta.createdAt > OAUTH_STATE_TTL_MS) oauthState.delete(key);
  }
}

function frontendBase() {
  return process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:5173';
}

function backendPublicBase() {
  const fromEnv = process.env.BACKEND_PUBLIC_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

function googleRedirectUri() {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.replace(/\/$/, '');
  }
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL.replace(/\/$/, '');
  }
  // Keep legacy callback path as default for compatibility with existing Google Console setups.
  return `${backendPublicBase()}/api/auth/google/callback`;
}

function redirectWithOAuthError(res, message) {
  const base = frontendBase();
  res.redirect(`${base}/oauth/callback#error=${encodeURIComponent(message)}`);
}

/**
 * GET /api/auth/oauth/:provider/start
 */
const oauthStart = (req, res) => {
  const { provider } = req.params;

  if (provider === 'microsoft') {
    return redirectWithOAuthError(res, 'Microsoft sign-in is not configured yet.');
  }

  if (provider !== 'google') {
    return res.status(404).json({ message: 'Unknown OAuth provider' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logger.warn('Google OAuth start: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return res.status(503).json({
      message:
        'Google sign-in is not configured on the server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }

  cleanupOAuthState();
  const state = crypto.randomBytes(24).toString('hex');
  oauthState.set(state, { createdAt: Date.now() });

  const redirectUri = googleRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(302, url);
};

/**
 * GET /api/auth/oauth/:provider/callback
 */
const oauthCallback = async (req, res) => {
  const { provider } = req.params;

  if (provider === 'microsoft') {
    return redirectWithOAuthError(res, 'Microsoft sign-in is not configured yet.');
  }

  if (provider !== 'google') {
    return res.status(404).json({ message: 'Unknown OAuth provider' });
  }

  if (req.query.error) {
    const msg =
      typeof req.query.error_description === 'string'
        ? req.query.error_description
        : String(req.query.error || 'OAuth error');
    logger.warn('Google OAuth callback error', { error: req.query.error });
    return redirectWithOAuthError(res, msg);
  }

  const { code, state } = req.query;
  if (!code || !state || typeof state !== 'string') {
    return redirectWithOAuthError(res, 'Invalid OAuth response (missing code or state).');
  }

  cleanupOAuthState();
  if (!oauthState.has(state)) {
    return redirectWithOAuthError(res, 'Invalid or expired sign-in session. Please try again.');
  }
  oauthState.delete(state);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithOAuthError(res, 'Google sign-in is not configured on the server.');
  }

  const redirectUri = googleRedirectUri();

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      logger.error('Google token exchange failed', {
        status: tokenRes.status,
        error: tokenJson?.error,
      });
      return redirectWithOAuthError(res, 'Could not complete Google sign-in. Please try again.');
    }

    const googleAccess = tokenJson.access_token;
    if (!googleAccess) {
      return redirectWithOAuthError(res, 'Could not complete Google sign-in.');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccess}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      logger.error('Google userinfo failed', { status: profileRes.status });
      return redirectWithOAuthError(res, 'Could not read your Google profile.');
    }

    const email = String(profile.email).trim().toLowerCase();
    const name =
      (typeof profile.name === 'string' && profile.name.trim()) ||
      email.split('@')[0];
    const picture = typeof profile.picture === 'string' ? profile.picture : '';

    let user = await User.findOne({ email });

    if (user) {
      if (user.status && user.status !== 'active') {
        return redirectWithOAuthError(res, 'This account cannot sign in.');
      }
      user.lastLoginAt = new Date();
      if (!user.profileImage && picture) user.profileImage = picture;
      await user.save();
    } else {
      const placeholderPassword = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 10);
      user = await User.create({
        name,
        email,
        password: placeholderPassword,
        role: 'student',
        profileImage: picture,
        emailVerified: Boolean(profile.email_verified),
        lastLoginAt: new Date(),
      });
      logger.info('OAuth user created', { email: user.email });
    }

    const { accessToken, refreshToken } = createTokenPairForUser(user);
    const base = frontendBase();
    const hash = new URLSearchParams({
      token: accessToken,
      refresh: refreshToken,
    }).toString();
    return res.redirect(302, `${base}/oauth/callback#${hash}`);
  } catch (error) {
    logger.error('Google OAuth callback exception', { message: error.message });
    return redirectWithOAuthError(res, 'Sign-in failed. Please try again.');
  }
};

module.exports = {
  oauthStart,
  oauthCallback,
};
