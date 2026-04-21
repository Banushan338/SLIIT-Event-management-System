const express = require('express');
const { body, param, query } = require('express-validator');
const commentController = require('../controllers/comment.controller');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.post(
  '/',
  body('eventId').isMongoId(),
  body('comment').isString().trim().notEmpty(),
  body('visibility').optional().isIn(['PUBLIC', 'ADMIN_ONLY', 'ROLE_BASED']),
  body('visibleRoles').optional().isArray(),
  validateRequest,
  commentController.postComment,
);

router.get(
  '/:eventId',
  param('eventId').isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest,
  commentController.getCommentsByEvent,
);

router.get(
  '/',
  query('eventId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  commentController.getCommentsForModeration,
);

router.patch(
  '/:id/visibility',
  param('id').isMongoId(),
  body('visibility').optional().isIn(['PUBLIC', 'ADMIN_ONLY', 'ROLE_BASED']),
  body('visibleRoles').optional().isArray(),
  body('hidden').optional().isBoolean(),
  validateRequest,
  commentController.patchVisibility,
);

router.delete(
  '/:id',
  param('id').isMongoId(),
  validateRequest,
  commentController.removeComment,
);

module.exports = router;
