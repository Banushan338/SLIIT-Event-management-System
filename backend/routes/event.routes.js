const express = require('express');
const {
  createLifecycleEvent,
  listLifecycleEvents,
  getLifecycleEvent,
  updateLifecycleEvent,
  cancelLifecycleEvent,
  deleteLifecycleEvent,
  listMyEvents,
  listPendingEvents,
  listAllEventsForFaculty,
  listApprovedEvents,
  approveEvent,
  rejectEvent,
  checkInQr,
  getOrganizerOverview,
  registerForEvent,
  getStudentRegistrations,
} = require('../controllers/event.controller');
const {
  getStudentPastFeedbackItems,
  submitFeedback,
  listOrganizerFeedbacks,
} = require('../controllers/eventFeedback.controller');

const router = express.Router();

// Organizer event endpoints
router.post('/', createLifecycleEvent);
router.get('/', listLifecycleEvents);
router.get('/overview', getOrganizerOverview);
router.get('/mine', listMyEvents);
router.get('/mine/feedbacks', listOrganizerFeedbacks);
router.get('/approved', listApprovedEvents);
router.get('/:id', getLifecycleEvent);
router.put('/:id', updateLifecycleEvent);
router.patch('/:id/cancel', cancelLifecycleEvent);
router.delete('/:id', deleteLifecycleEvent);
router.post('/:id/checkin', checkInQr);
router.post('/:id/register', registerForEvent);

// Student endpoints
router.get('/student/registrations', getStudentRegistrations);
router.get('/student/past-feedback', getStudentPastFeedbackItems);
router.post('/:id/feedback', submitFeedback);

// Faculty coordinator endpoints
router.get('/pending', listPendingEvents);
router.get('/faculty/all', listAllEventsForFaculty);
router.post('/:id/approve', approveEvent);
router.post('/:id/reject', rejectEvent);

module.exports = router;

