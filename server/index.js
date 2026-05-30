const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./db')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'EVV Server is running' })
})

// This route will query your actual users table to confirm everything works
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users')
    res.json({
      message: '✅ Database connected successfully',
      users_count: result.rows[0].count
    })
  } catch (error) {
    res.status(500).json({
      message: '❌ Database query failed',
      error: error.message
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})