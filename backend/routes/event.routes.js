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
<<<<<<< HEAD
router.post('/', createLifecycleEvent);
=======
router.post('/', uploadEventImagesSafe, createLifecycleEvent);
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
router.get('/', listLifecycleEvents);
router.get('/overview', getOrganizerOverview);
router.get('/mine', listMyEvents);
router.get('/mine/feedbacks', listOrganizerFeedbacks);
router.get('/approved', listApprovedEvents);
router.get('/:id', getLifecycleEvent);
<<<<<<< HEAD
router.put('/:id', updateLifecycleEvent);
=======
router.put('/:id', uploadEventImagesSafe, updateLifecycleEvent);
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
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

