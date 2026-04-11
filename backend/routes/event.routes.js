const express = require('express');
const {
  createEvent,
  listMyEvents,
  updateMyEvent,
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

const router = express.Router();

// Organizer event endpoints
router.post('/', createEvent);
router.get('/overview', getOrganizerOverview);
router.get('/mine', listMyEvents);
router.get('/approved', listApprovedEvents);
router.put('/:id', updateMyEvent);
router.post('/:id/checkin', checkInQr);
router.post('/:id/register', registerForEvent);

// Student endpoints
router.get('/student/registrations', getStudentRegistrations);

// Faculty coordinator endpoints
router.get('/pending', listPendingEvents);
router.get('/faculty/all', listAllEventsForFaculty);
router.post('/:id/approve', approveEvent);
router.post('/:id/reject', rejectEvent);

module.exports = router;

