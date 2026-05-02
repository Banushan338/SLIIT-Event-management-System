const express = require('express')
const router = express.Router()

const announcementController = require('../controllers/announcement.controller')
const { authenticate, requireAdmin } = require('../middleware/auth.middleware')

router.post('/', authenticate, requireAdmin, announcementController.createAnnouncement)
router.get('/', authenticate, requireAdmin, announcementController.getAnnouncements)

module.exports = router