const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  changePassword,
  forgotPassword,
  forgotPasswordOtp,
  resetPasswordWithToken,
  resetPasswordWithOtp,
} = require('../controllers/auth.controller');
const {
  issueJwt,
  refreshAccessToken,
  logout,
  authenticate,
} = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');
const userController = require('../controllers/user.controller');
const { oauthStart, oauthCallback } = require('../controllers/oauth.controller');

const router = express.Router();

router.get('/oauth/:provider/start', oauthStart);
router.get('/oauth/:provider/callback', oauthCallback);
// Legacy aliases for Google OAuth routes (backward compatibility).
router.get('/google/start', (req, res) => {
  req.params.provider = 'google';
  return oauthStart(req, res);
});
router.get('/google/callback', (req, res) => {
  req.params.provider = 'google';
  return oauthCallback(req, res);
});

/** Current user (same payload shape as /api/users/profile). */
router.get('/me', authenticate, userController.getProfile);

router.post('/register', register, issueJwt);
router.post('/login', login, issueJwt);
router.post(
  '/forgot-password',
  body('email').isEmail(),
  validateRequest,
  forgotPassword,
);
/** Legacy OTP flow (prints OTP to server console in dev). */
router.post(
  '/forgot-password-otp',
  body('email').isEmail(),
  validateRequest,
  forgotPasswordOtp,
);
router.post(
  '/reset-password/:token',
  body('newPassword').isString().isLength({ min: 6 }),
  body('confirmPassword').isString(),
  validateRequest,
  resetPasswordWithToken,
);
router.post('/reset-password-otp', resetPasswordWithOtp);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.put('/change-password', authenticate, changePassword);

module.exports = router;

