const express = require('express')
const router = express.Router()
const { checkIn, checkOut, getVisitById, getAllVisits } = require('../controllers/visitController')
const { verifyToken, adminOnly } = require('../middleware/auth')

router.post('/checkin', verifyToken, checkIn)
router.post('/checkout', verifyToken, checkOut)
router.get('/all', verifyToken, adminOnly, getAllVisits)
router.get('/:id', verifyToken, getVisitById)

module.exports = router