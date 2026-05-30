const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./db')
const authRoutes = require('./routes/auth')

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/auth', authRoutes)

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users')
    res.json({
      message: '✅ Database connected successfully',
      users_count: result.rows[0].count
    })
  } catch (error) {
    res.status(500).json({ message: '❌ Query failed', error: error.message })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})