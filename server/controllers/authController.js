const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')

// ─── REGISTER (Create a new user) ───────────────────────────────────────────
// You'll use this to create the first admin manually, 
// then admins can create caregivers from the dashboard later
const register = async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body

    // 1. Check all required fields are present
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide full_name, email, password and role' })
    }

    // 2. Make sure role is valid
    if (!['admin', 'caregiver'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or caregiver' })
    }

    // 3. Check if email already exists in the database
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // 4. Hash the password — never store plain text passwords
    // The number 10 is the "salt rounds" — higher = more secure but slower
    // 10 is the industry standard balance
    const password_hash = await bcrypt.hash(password, 10)

    // 5. Insert the new user into the database
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, role, phone, is_active, created_at`,
      [full_name, email, password_hash, role, phone || null]
    )

    const newUser = result.rows[0]

    // 6. Log this action in audit_logs
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [newUser.user_id, 'USER_REGISTERED', 'users', newUser.user_id]
    )

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    })

  } catch (error) {
    console.error('Register error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // 1. Check fields exist
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    // 2. Find the user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    // 3. If no user found, return error
    // Note: we say "invalid credentials" not "email not found"
    // — never tell attackers which part was wrong
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // 4. Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated. Contact your administrator.' })
    }

    // 5. Compare the entered password against the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // 6. Create a JWT token
    // The token carries the user's id and role — this is what your
    // middleware will read later to know who is making each request
    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // token expires after 8 hours
    )

    // 7. Log the login action
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [user.user_id, 'USER_LOGIN', 'users', user.user_id]
    )

    // 8. Return the token and basic user info
    // Never return password_hash in the response
    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        id: user.user_id,
        full_name: user.full_name,
        name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    })

  } catch (error) {
    console.error('Login error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET CURRENT USER ────────────────────────────────────────────────────────
// Returns the logged-in user's profile
// The middleware will attach the userId to req before this runs
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, role, phone, is_active, created_at
       FROM users WHERE user_id = $1`,
      [req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const u = result.rows[0]
    res.json({ user: { ...u, id: u.user_id, name: u.full_name } })

  } catch (error) {
    console.error('GetMe error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── UPDATE CAREGIVER (admin only) ──────────────────────────────────────────
const updateCaregiver = async (req, res) => {
  try {
    const { id } = req.params
    const { full_name, email, phone, password, is_active } = req.body

    const existing = await pool.query(
      'SELECT * FROM users WHERE user_id = $1 AND role = $2',
      [id, 'caregiver']
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Caregiver not found' })
    }

    const oldUser = existing.rows[0]

    if (email && email !== oldUser.email) {
      const duplicate = await pool.query(
        'SELECT user_id FROM users WHERE email = $1 AND user_id <> $2',
        [email, id]
      )

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ message: 'Email already registered' })
      }
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : null

    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        password_hash = COALESCE($4, password_hash),
        is_active = COALESCE($5, is_active)
       WHERE user_id = $6 AND role = 'caregiver'
       RETURNING user_id, full_name, email, role, phone, is_active, created_at`,
      [full_name, email, phone, password_hash, is_active, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Caregiver not found' })
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.userId,
        'CAREGIVER_UPDATED',
        'users',
        id,
        JSON.stringify(oldUser),
        JSON.stringify(result.rows[0])
      ]
    )

    const updatedUser = result.rows[0]
    res.json({
      message: 'Caregiver updated successfully',
      user: { ...updatedUser, id: updatedUser.user_id, name: updatedUser.full_name }
    })
  } catch (error) {
    console.error('Update caregiver error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── DEACTIVATE CAREGIVER (admin only) ──────────────────────────────────────
const deactivateCaregiver = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await pool.query(
      'SELECT user_id, full_name, email, phone, role, is_active FROM users WHERE user_id = $1 AND role = $2',
      [id, 'caregiver']
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Caregiver not found' })
    }

    const result = await pool.query(
      `UPDATE users SET is_active = false
       WHERE user_id = $1 AND role = 'caregiver'
       RETURNING user_id, full_name, email, phone, role, is_active, created_at`,
      [id]
    )

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'CAREGIVER_DEACTIVATED', 'users', id, JSON.stringify(existing.rows[0])]
    )

    const caregiver = result.rows[0]
    res.json({
      message: 'Caregiver deleted successfully',
      user: { ...caregiver, id: caregiver.user_id, name: caregiver.full_name }
    })
  } catch (error) {
    console.error('Deactivate caregiver error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { register, login, getMe, updateCaregiver, deactivateCaregiver }