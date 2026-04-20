const express = require('express');
const { body } = require('express-validator');
const notificationController = require('../controllers/notification.controller');
const { validateRequest } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/', notificationController.listMine);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch(
  '/preferences',
  body('email').optional().isBoolean(),
  body('sms').optional().isBoolean(),
  body('inApp').optional().isBoolean(),
  body('eventNotifications').optional().isBoolean(),
  body('approvalNotifications').optional().isBoolean(),
  validateRequest,
  notificationController.patchPreferences,
);
router.patch('/read', notificationController.patchReadBulk);
router.patch('/:id/read', notificationController.patchRead);
router.post('/read-all', notificationController.postReadAll);

module.exports = router;
