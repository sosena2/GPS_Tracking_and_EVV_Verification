const haversine = require('haversine-distance')

// ─── CALCULATE DISTANCE ───────────────────────────────────────────────────────
// Takes two GPS points and returns the distance in meters
// point format: { latitude: number, longitude: number }
const calculateDistance = (point1, point2) => {
  // haversine-distance returns meters
  const distanceMeters = haversine(point1, point2)
  return Math.round(distanceMeters * 100) / 100 // round to 2 decimal places
}

// ─── VALIDATE GEOFENCE ────────────────────────────────────────────────────────
// Returns whether the caregiver is inside the allowed radius
const validateGeofence = (caregiverCoords, clientCoords, allowedRadiusMeters = 100) => {
  const distance = calculateDistance(caregiverCoords, clientCoords)

  return {
    distance,
    isInside: distance <= allowedRadiusMeters,
    allowedRadius: allowedRadiusMeters
  }
}

// ─── DETECT SUSPICIOUS GPS ───────────────────────────────────────────────────
// GPS accuracy above 500 meters usually means the location is fake
// or the device GPS is not working properly
const isSuspiciousGPS = (accuracy) => {
  if (!accuracy) return false
  return accuracy > 500
}

// ─── CHECK FOR DUPLICATE CHECKINS ────────────────────────────────────────────
// Detects if the same caregiver checked in multiple times
// within a short window (10 minutes) — sign of fraud
const checkDuplicateCheckin = async (pool, caregiverId) => {
  const result = await pool.query(
    `SELECT visit_id FROM visits
     WHERE caregiver_id = $1
     AND status = 'in_progress'
     AND check_in_time >= NOW() - INTERVAL '10 minutes'`,
    [caregiverId]
  )
  return result.rows.length > 0
}

// ─── CHECK DEVICE CONSISTENCY ─────────────────────────────────────────────────
// Makes sure the same device was used for check-in and check-out
const checkDeviceConsistency = (checkinDevice, checkoutDevice) => {
  if (!checkinDevice || !checkoutDevice) return true // skip if no device info
  return checkinDevice === checkoutDevice
}

// ─── CALCULATE VISIT DURATION ─────────────────────────────────────────────────
// Returns duration in minutes between two timestamps
const calculateDuration = (checkinTime, checkoutTime) => {
  const start = new Date(checkinTime)
  const end = new Date(checkoutTime)
  const diffMs = end - start
  return Math.round(diffMs / 60000) // convert ms to minutes
}

// ─── DETERMINE EVV STATUS ─────────────────────────────────────────────────────
// This is the main EVV brain — it looks at all the data and assigns a status
const determineEVVStatus = ({
  isInsideGeofence,
  isSuspiciousGPS,
  isDuplicateCheckin,
  isDeviceConsistent,
  durationMinutes,
  scheduledDurationMinutes
}) => {
  const alerts = []

  // Fraud conditions — immediate rejection
  if (isSuspiciousGPS) {
    alerts.push({ type: 'gps_spoofing', severity: 'critical', message: 'GPS accuracy is suspiciously low — possible fake GPS' })
  }

  if (isDuplicateCheckin) {
    alerts.push({ type: 'suspicious_pattern', severity: 'high', message: 'Multiple check-ins detected within 10 minutes' })
  }

  if (!isInsideGeofence) {
    alerts.push({ type: 'location_mismatch', severity: 'high', message: 'Caregiver was outside the allowed geofence radius' })
  }

  // Warning conditions
  if (!isDeviceConsistent) {
    alerts.push({ type: 'suspicious_pattern', severity: 'medium', message: 'Different device used for check-in and check-out' })
  }

  if (durationMinutes && scheduledDurationMinutes) {
    const minAcceptable = scheduledDurationMinutes * 0.7 // allow 30% shorter
    if (durationMinutes < minAcceptable) {
      alerts.push({ type: 'time_mismatch', severity: 'medium', message: `Visit was too short: ${durationMinutes} min vs scheduled ${scheduledDurationMinutes} min` })
    }
  }

  // Determine final status based on alerts
  const hasCritical = alerts.some(a => a.severity === 'critical')
  const hasHigh = alerts.some(a => a.severity === 'high')
  const hasMedium = alerts.some(a => a.severity === 'medium')

  let evvStatus
  if (hasCritical || (hasHigh && alerts.length >= 2)) {
    evvStatus = 'fraud_suspected'
  } else if (hasHigh) {
    evvStatus = 'fraud_suspected'
  } else if (hasMedium) {
    evvStatus = 'completed' // completed but with warnings
  } else {
    evvStatus = 'completed'
  }

  return { evvStatus, alerts }
}

module.exports = {
  calculateDistance,
  validateGeofence,
  isSuspiciousGPS,
  checkDuplicateCheckin,
  checkDeviceConsistency,
  calculateDuration,
  determineEVVStatus
}