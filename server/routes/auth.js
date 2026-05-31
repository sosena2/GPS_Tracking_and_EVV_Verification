const express = require('express')
const router = express.Router()
const { register, login, getMe } = require('../controllers/authController')
const { verifyToken } = require('../middleware/auth')

// Public routes — no token needed
router.post('/register', register)
router.post('/login', login)

// Protected route — token required
// verifyToken runs first, then getMe
router.get('/me', verifyToken, getMe)

module.exports = router

