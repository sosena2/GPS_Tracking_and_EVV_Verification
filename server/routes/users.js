const express = require('express')
const router = express.Router()
const pool = require('../db')
const { updateCaregiver, deactivateCaregiver } = require('../controllers/authController')
const { verifyToken, adminOnly } = require('../middleware/auth')

router.get('/caregivers', verifyToken, adminOnly, async (req, res) => {
  try {
    const { active } = req.query
    const activeFilter = active ?? 'true'

    let query = `
      SELECT user_id, full_name, email, phone, role, is_active
      FROM users
      WHERE role = 'caregiver'
    `

    if (activeFilter === 'true') {
      query += ' AND is_active = true'
    } else if (activeFilter === 'false') {
      query += ' AND is_active = false'
    }

    query += ' ORDER BY full_name ASC'

    const result = await pool.query(
      query
    )

    const caregivers = result.rows.map((row) => ({
      ...row,
      id: row.user_id,
      name: row.full_name
    }))

    res.json({
      message: 'Caregivers retrieved successfully',
      count: caregivers.length,
      caregivers
    })
  } catch (error) {
    console.error('Get caregivers error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

router.put('/caregivers/:id', verifyToken, adminOnly, updateCaregiver)
router.delete('/caregivers/:id', verifyToken, adminOnly, deactivateCaregiver)

module.exports = router