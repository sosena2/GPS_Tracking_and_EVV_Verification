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

const http = require('http')
const jwt = require('jsonwebtoken')

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

// Create HTTP server and attach Socket.IO
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
  // Expect the client to send auth token in handshake auth
  const token = socket.handshake.auth && socket.handshake.auth.token
  let user = null
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = user
    } catch (e) {
      socket.emit('error', 'Authentication failed')
      socket.disconnect(true)
      return
    }
  } else {
    socket.emit('error', 'No auth token provided')
    socket.disconnect(true)
    return
  }

  socket.on('join', ({ visitId }) => {
    if (!visitId) return
    const room = `visit:${visitId}`
    socket.join(room)
  })

  socket.on('gps:update', async (payload) => {
    try {
      const { visit_id, latitude, longitude, accuracy, device_info } = payload || {}
      if (!visit_id || latitude == null || longitude == null) return

      // Persist to gps_logs
      await require('./db').query(
        `INSERT INTO gps_logs (visit_id, user_id, latitude, longitude, accuracy, device_info, captured_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [visit_id, socket.user.userId, latitude, longitude, accuracy || null, device_info || null]
      )

      const room = `visit:${visit_id}`
      const message = {
        visit_id,
        user_id: socket.user.userId,
        latitude,
        longitude,
        accuracy: accuracy || null,
        device_info: device_info || null,
        captured_at: new Date().toISOString()
      }
      io.to(room).emit('gps:log', message)
    } catch (err) {
      console.error('Socket gps:update error:', err.message)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})