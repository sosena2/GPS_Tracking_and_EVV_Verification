const express = require('express')
const router = express.Router()
const {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deactivateClient
} = require('../controllers/clientController')
const { verifyToken, adminOnly } = require('../middleware/auth')

// All client routes require a valid token
// verifyToken runs first on every route below

// Admin only — create a client
router.post('/', verifyToken, adminOnly, createClient)

// Both admin and caregiver can view clients
router.get('/', verifyToken, getAllClients)
router.get('/:id', verifyToken, getClientById)

// Admin only — update and deactivate
router.put('/:id', verifyToken, adminOnly, updateClient)
router.patch('/:id/deactivate', verifyToken, adminOnly, deactivateClient)
router.delete('/:id', verifyToken, adminOnly, deactivateClient)

module.exports = router