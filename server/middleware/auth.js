const jwt = require('jsonwebtoken')

// ─── VERIFY TOKEN ─────────────────────────────────────────────────────────────
// This middleware runs before any protected route
// It reads the token from the request header, verifies it,
// and attaches the user info to req.user so controllers can use it
const verifyToken = (req, res, next) => {
  try {
    // 1. Get the token from the Authorization header
    // The header looks like: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' })
    }

    // 2. Extract just the token part (remove "Bearer ")
    const token = authHeader.split(' ')[1]

    // 3. Verify the token using your secret key
    // If the token is expired or tampered with, this will throw an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // 4. Attach the decoded user info to the request
    // Now any controller after this middleware can access req.user.userId and req.user.role
    req.user = decoded

    // 5. Pass control to the next middleware or controller
    next()

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }
    return res.status(401).json({ message: 'Invalid token. Please log in.' })
  }
}

// ─── ADMIN ONLY ───────────────────────────────────────────────────────────────
// Use this on routes that only admins should access
// Always use verifyToken first, then adminOnly
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' })
  }
  next()
}

// ─── CAREGIVER ONLY ───────────────────────────────────────────────────────────
const caregiverOnly = (req, res, next) => {
  if (req.user.role !== 'caregiver') {
    return res.status(403).json({ message: 'Access denied. Caregivers only.' })
  }
  next()
}

module.exports = { verifyToken, adminOnly, caregiverOnly }