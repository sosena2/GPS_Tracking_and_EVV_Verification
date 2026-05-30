const express = require('express')
const router = express.Router()
const { getAllAlerts, resolveAlert, getDailyReport } = require('../controllers/alertController')
const { verifyToken, adminOnly } = require('../middleware/auth')

router.get('/', verifyToken, adminOnly, getAllAlerts)
router.patch('/:id/resolve', verifyToken, adminOnly, resolveAlert)
router.get('/reports/daily', verifyToken, adminOnly, getDailyReport)

module.exports = router