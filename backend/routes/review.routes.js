const express = require('express');
const { body, param, query } = require('express-validator');
const reviewController = require('../controllers/review.controller');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.post(
  '/',
  body('eventId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('reviewText').optional().isString(),
  validateRequest,
  reviewController.submitReview,
);

router.get(
  '/:eventId',
  param('eventId').isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest,
  reviewController.listReviewsByEvent,
);

module.exports = router;
