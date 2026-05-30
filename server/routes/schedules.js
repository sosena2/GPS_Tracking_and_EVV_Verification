const express = require('express')
const router = express.Router()
const {
  createSchedule,
  getAllSchedules,
  getCaregiverSchedules,
  updateScheduleStatus
} = require('../controllers/scheduleController')
const { verifyToken, adminOnly } = require('../middleware/auth')

// Admin only
router.post('/', verifyToken, adminOnly, createSchedule)
router.get('/admin', verifyToken, adminOnly, getAllSchedules)
router.patch('/:id/status', verifyToken, adminOnly, updateScheduleStatus)

// Both roles — but controller enforces caregiver can only see their own
router.get('/caregiver/:id', verifyToken, getCaregiverSchedules)

module.exports = router