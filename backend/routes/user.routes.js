const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');
const { uploadProfileImage: uploadMw } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/profile', authenticate, userController.getProfile);

router.put(
  '/profile',
  authenticate,
  body('name').optional().isString().trim().notEmpty(),
  body('phone').optional().isString().trim(),
  body('department').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('password').optional().isString().isLength({ min: 6 }),
  body('roleProfile').optional().isObject(),
  validateRequest,
  userController.updateProfile,
);

router.put(
  '/upload-image',
  authenticate,
  (req, res, next) => {
    uploadMw.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Invalid file upload' });
      }
      return next();
    });
  },
  userController.uploadProfileImage,
);

module.exports = router;
