const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./db')
const authRoutes = require('./routes/auth')
const clientRoutes = require('./routes/clients')
const scheduleRoutes = require('./routes/schedules')
const visitRoutes = require('./routes/visits')
const alertRoutes = require('./routes/alerts')
const userRoutes = require('./routes/users')

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/users', userRoutes)

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users')
    res.json({ message: '✅ Connected', users_count: result.rows[0].count })
  } catch (error) {
    res.status(500).json({ message: '❌ Failed', error: error.message })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})