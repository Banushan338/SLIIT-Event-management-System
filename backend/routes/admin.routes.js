const express = require('express');
const { body, param, query } = require('express-validator');
const {
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
} = require('../controllers/admin.controller');
const { validateRequest } = require('../middleware/validate.middleware');
const { uploadProfileImage: uploadMw } = require('../middleware/upload.middleware');

const router = express.Router();

router.post('/users', createUserByAdmin);

router.get(
  '/users',
  [
    query('role').optional().isString().trim(),
    query('status').optional().isString().trim(),
    query('department').optional().isString().trim(),
    query('q').optional().isString().trim(),
  ],
  validateRequest,
  listUsers,
);

router.patch(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('name').optional().isString().trim().notEmpty(),
    body('role').optional().isString().trim(),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
    body('phone').optional().isString(),
    body('department').optional().isString(),
    body('registrationNumber').optional().isString(),
    body('staffId').optional().isString(),
    body('bio').optional().isString().isLength({ max: 500 }),
    body('address').optional().isObject(),
    body('address.line1').optional().isString(),
    body('address.city').optional().isString(),
    body('address.district').optional().isString(),
    body('emailVerified').optional().isBoolean(),
    body('password').optional().isString().isLength({ min: 6 }),
    body('roleProfile').optional().isObject(),
  ],
  validateRequest,
  updateUserByAdmin,
);

router.patch(
  '/users/:id/role',
  [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('role').isString().trim().notEmpty(),
  ],
  validateRequest,
  changeUserRole,
);

router.patch(
  '/users/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('status').isIn(['active', 'inactive', 'suspended']),
  ],
  validateRequest,
  changeUserStatus,
);

router.delete(
  '/users/:id',
  [param('id').isMongoId().withMessage('Invalid user id')],
  validateRequest,
  deleteUserByAdmin,
);

router.post(
  '/users/:id/image',
  [
    param('id').isMongoId().withMessage('Invalid user id'),
    validateRequest,
  ],
  (req, res, next) => {
    uploadMw.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Invalid file upload' });
      }
      return next();
    });
  },
  uploadUserImageByAdmin,
);

router.get(
  '/audit-logs',
  [query('limit').optional().isInt({ min: 1, max: 500 })],
  validateRequest,
  listAuditLogs,
);

router.get('/feedbacks', listAllFeedbacks);
router.delete('/feedbacks/:id', deleteFeedback);

module.exports = router;
