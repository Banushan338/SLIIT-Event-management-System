const express = require('express');
const { body, param, query } = require('express-validator');
const feedbackController = require('../controllers/feedback.controller');
const {
  authenticate,
  requireStudent,
  requireAdmin,
  requireOrganizerOrAdmin,
} = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/analytics/summary', authenticate, requireOrganizerOrAdmin, feedbackController.getAnalytics);

router.post(
  '/',
  authenticate,
  requireStudent,
  body('eventId').isMongoId(),
  body('category').isIn(['Organization', 'Content', 'Venue', 'Other']),
  body('message').isString().trim().notEmpty(),
  body('rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  validateRequest,
  feedbackController.submit,
);

router.get('/my', authenticate, requireStudent, feedbackController.getMine);
router.get(
  '/:eventId',
  authenticate,
  requireOrganizerOrAdmin,
  param('eventId').isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest,
  feedbackController.getByEvent,
);
router.get(
  '/event/:eventId',
  authenticate,
  requireOrganizerOrAdmin,
  param('eventId').isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest,
  feedbackController.getByEvent,
);
router.delete('/:id', authenticate, requireAdmin, feedbackController.remove);

module.exports = router;
