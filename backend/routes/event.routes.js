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
  unregisterFromEvent,
  getStudentRegistrations,
} = require('../controllers/event.controller');
const {
  previewEventSimulation,
  getResourceInsights,
  getEventStoryPdf,
} = require('../controllers/adminEvent.controller');
const { uploadEventImages } = require('../middleware/upload.middleware');
const {
  getStudentPastFeedbackItems,
  submitFeedback,
  listOrganizerFeedbacks,
} = require('../controllers/eventFeedback.controller');

const router = express.Router();

const uploadEventImagesSafe = (req, res, next) => {
  uploadEventImages.array('images', 3)(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({
      message: err.message || 'Invalid event image upload payload',
    });
  });
};

// Organizer event endpoints
router.post('/', uploadEventImagesSafe, createLifecycleEvent);
router.get('/', listLifecycleEvents);
router.get('/overview', getOrganizerOverview);
router.get('/mine', listMyEvents);
router.get('/mine/feedbacks', listOrganizerFeedbacks);
router.get('/approved', listApprovedEvents);
router.put('/:id', updateLifecycleEvent);
router.patch('/:id/cancel', cancelLifecycleEvent);
router.delete('/:id', deleteLifecycleEvent);
router.post('/:id/checkin', checkInQr);
router.post('/:id/register', registerForEvent);


// Student endpoints
router.get('/student/registrations', getStudentRegistrations);
router.get('/student/past-feedback', getStudentPastFeedbackItems);

// Faculty coordinator endpoints
router.get('/pending', listPendingEvents);
router.get('/faculty/all', listAllEventsForFaculty);
router.get('/:id/story-pdf', getEventStoryPdf);
router.get('/:id/resource-insights', getResourceInsights);
router.get('/:id', getLifecycleEvent);
router.put('/:id', uploadEventImagesSafe, updateLifecycleEvent);
router.patch('/:id/cancel', cancelLifecycleEvent);
router.delete('/:id', deleteLifecycleEvent);
router.post('/:id/checkin', checkInQr);
router.post('/:id/register', registerForEvent);
router.delete('/:id/register', unregisterFromEvent);
router.post('/:id/feedback', submitFeedback);
router.post('/:id/approve', approveEvent);
router.post('/:id/reject', rejectEvent);

module.exports = router;

