const express = require('express');
const {
  getFacultyOverview,
  listFacultyNotifications,
} = require('../controllers/faculty.controller');

const router = express.Router();

router.get('/overview', getFacultyOverview);
router.get('/notifications', listFacultyNotifications);

module.exports = router;

