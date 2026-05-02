const { Announcement } = require('../models/announcement.model')
const notificationService = require('../services/notification.service')

async function createAnnouncement(req, res) {
  try {
    const { title, message, targetRole = 'all' } = req.body

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' })
    }

    const announcement = await Announcement.create({
      title,
      message,
      targetRole,
      createdBy: req.user.id,
    })

    if (targetRole === 'all') {
      await notificationService.notifyUsersByRoles(
        ['student', 'organizer', 'facultyCoordinator', 'admin', 'superAdmin'],
        {
          title: `📢 ${title}`,
          message,
          type: 'info',
          category: 'ANNOUNCEMENT',
          roleTarget: 'ALL_USERS',
        },
        { sendEmail: false },
      )
    } else {
      await notificationService.notifyUsersByRoles(
        [targetRole],
        {
          title: `📢 ${title}`,
          message,
          type: 'info',
          category: 'ANNOUNCEMENT',
          roleTarget: targetRole.toUpperCase(),
        },
        { sendEmail: false },
      )
    }

    return res.status(201).json({
      message: 'Announcement published successfully',
      announcement,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

async function getAnnouncements(req, res) {
  try {
    const rows = await Announcement.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })

    return res.json({ announcements: rows })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

module.exports = {
  createAnnouncement,
  getAnnouncements,
}