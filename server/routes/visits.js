const express = require('express')
const router = express.Router()
const { checkIn, checkOut, getVisitById, getAllVisits } = require('../controllers/visitController')
const { verifyToken, adminOnly } = require('../middleware/auth')

// Support both: body-based (old) and param-based routes (frontend uses /visits/:id/checkin)
router.post('/checkin', verifyToken, checkIn)
router.post('/:id/checkin', verifyToken, checkIn)

router.post('/checkout', verifyToken, checkOut)
router.post('/:id/checkout', verifyToken, checkOut)
// Active visits for admin dashboard
const { getActiveVisits } = require('../controllers/visitController')
router.get('/active', verifyToken, getActiveVisits)
router.get('/all', verifyToken, adminOnly, getAllVisits)
router.get('/:id', verifyToken, getVisitById)

module.exports = router