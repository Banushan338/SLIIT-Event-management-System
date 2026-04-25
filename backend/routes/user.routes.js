const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');
const { uploadProfileImage: uploadMw } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/profile', authenticate, userController.getProfile);
router.get('/me', authenticate, userController.getProfile);

router.put(
  '/profile',
  authenticate,
  body('name').optional().isString().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString().trim(),
  body('address').optional().isObject(),
  body('address.line1').optional().isString().trim(),
  body('address.city').optional().isString().trim(),
  body('address.district').optional().isString().trim(),
  body('department').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('bio').optional().isString().isLength({ max: 500 }),
  body('roleProfile').optional().isObject(),
  validateRequest,
  userController.updateProfile,
);

router.put(
  '/me',
  authenticate,
  body('name').optional().isString().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString().trim(),
  body('address').optional().isObject(),
  body('address.line1').optional().isString().trim(),
  body('address.city').optional().isString().trim(),
  body('address.district').optional().isString().trim(),
  body('department').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('bio').optional().isString().isLength({ max: 500 }),
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

router.post(
  '/deletion-request',
  authenticate,
  body('reason').isString().trim().isLength({ min: 5, max: 1000 }),
  validateRequest,
  userController.requestAccountDeletion,
);

module.exports = router;
