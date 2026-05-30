const express = require('express')
const router = express.Router()
const { getAllAlerts, resolveAlert, getDailyReport, getVisitReport, getFraudReport, getAttendanceReport } = require('../controllers/alertController')
const { verifyToken, adminOnly } = require('../middleware/auth')

router.get('/', verifyToken, adminOnly, getAllAlerts)
router.patch('/:id/resolve', verifyToken, adminOnly, resolveAlert)
router.get('/reports/daily', verifyToken, adminOnly, getDailyReport)

// Additional report endpoints matching frontend expectations
router.get('/reports/visits', verifyToken, adminOnly, getVisitReport)
router.get('/reports/fraud', verifyToken, adminOnly, getFraudReport)
router.get('/reports/attendance', verifyToken, adminOnly, getAttendanceReport)

module.exports = router