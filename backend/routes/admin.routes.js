const express = require('express');
const { createUserByAdmin, listUsers } = require('../controllers/admin.controller');

const router = express.Router();

// Admin can create users with roles: student, organizer, facultyCoordinator
router.post('/users', createUserByAdmin);
router.get('/users', listUsers);

module.exports = router;

