const pool = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// ─── REGISTER ───────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, role } = req.body

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Please provide full_name, email and password' })
    }

    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'User with that email already exists' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING user_id, full_name, email, phone, role, is_active`,
      [full_name, email, phone || null, password_hash, role || 'caregiver']
    )

    const user = result.rows[0]
    res.status(201).json({ message: 'User registered', user })
  } catch (error) {
    console.error('Register error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('📧 Login attempt:', email)
    console.log('🔑 Password received:', password)

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    console.log('👤 User found:', result.rows.length > 0 ? 'YES' : 'NO')

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]

    console.log('✅ is_active:', user.is_active)
    console.log('🔒 password_hash in DB:', user.password_hash)

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated.' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    console.log('🔓 Password match:', passwordMatch)

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id:   user.user_id,
        id:        user.user_id,
        full_name: user.full_name,
        name:      user.full_name,
        email:     user.email,
        role:      user.role,
        phone:     user.phone
      }
    })

  } catch (error) {
    console.error('Login error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET CURRENT USER ──────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const { userId } = req.user
    const result = await pool.query('SELECT user_id, full_name, email, phone, role, is_active FROM users WHERE user_id = $1', [userId])
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' })
    const u = result.rows[0]
    res.json({ user: { ...u, id: u.user_id, name: u.full_name } })
  } catch (error) {
    console.error('GetMe error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── UPDATE CAREGIVER (admin) ──────────────────────────────────────────────
const updateCaregiver = async (req, res) => {
  try {
    const { id } = req.params
    const { full_name, email, phone, role, is_active } = req.body

    const result = await pool.query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         role = COALESCE($4, role),
         is_active = COALESCE($5, is_active)
       WHERE user_id = $6
       RETURNING user_id, full_name, email, phone, role, is_active`,
      [full_name, email, phone, role, is_active, id]
    )

    if (result.rows.length === 0) return res.status(404).json({ message: 'Caregiver not found' })
    const u = result.rows[0]
    res.json({ message: 'Caregiver updated', caregiver: { ...u, id: u.user_id, name: u.full_name } })
  } catch (error) {
    console.error('Update caregiver error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── DEACTIVATE CAREGIVER (admin) ──────────────────────────────────────────
const deactivateCaregiver = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [id])
    res.json({ message: 'Caregiver deactivated' })
  } catch (error) {
    console.error('Deactivate caregiver error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { register, login, getMe, updateCaregiver, deactivateCaregiver }