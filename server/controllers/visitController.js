const pool = require('../db')
const {
  validateGeofence,
  isSuspiciousGPS,
  checkDuplicateCheckin,
  checkDeviceConsistency,
  calculateDuration,
  determineEVVStatus,
  calculateDistance
} = require('../services/evvService')

// ─── GPS CHECK-IN ─────────────────────────────────────────────────────────────
const checkIn = async (req, res) => {
  try {
    // visit id can come in the body (legacy) or as a URL param (/visits/:id/checkin)
    const {
      visit_id: body_visit_id,
      latitude,
      longitude,
      lat,
      lng,
      accuracy,
      device_info
    } = req.body
    const visit_id = body_visit_id || req.params.id
    const resolvedLatitude = latitude ?? lat
    const resolvedLongitude = longitude ?? lng

    const caregiverId = req.user.userId

    // 1. Validate input
    if (!visit_id || resolvedLatitude == null || resolvedLongitude == null) {
      return res.status(400).json({
        message: 'Please provide visit_id, latitude and longitude'
      })
    }

    const parsedLat = parseFloat(resolvedLatitude)
    const parsedLng = parseFloat(resolvedLongitude)

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ message: 'Invalid GPS coordinates' })
    }

    // 2. Get the visit record and its linked schedule and client
    const visitResult = await pool.query(
      `SELECT
        v.visit_id,
        v.status,
        v.caregiver_id,
        v.client_id,
        v.schedule_id,
        s.scheduled_start,
        s.scheduled_end,
        c.latitude AS client_lat,
        c.longitude AS client_lng,
        c.first_name || ' ' || c.last_name AS client_name
       FROM visits v
       JOIN schedules s ON v.schedule_id = s.schedule_id
       JOIN clients c ON v.client_id = c.client_id
       WHERE v.visit_id::text = $1::text OR v.schedule_id::text = $1::text`,
      [visit_id]
    )

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ message: 'Visit not found' })
    }

    const visit = visitResult.rows[0]
    const resolvedVisitId = visit.visit_id

    // 3. Security: make sure this caregiver owns this visit
    if (visit.caregiver_id !== caregiverId) {
      return res.status(403).json({ message: 'This visit is not assigned to you' })
    }

    // 4. Make sure visit hasn't already been checked in
    if (visit.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot check in — visit status is already: ${visit.status}`
      })
    }

    // 5. Run GPS validation
    const caregiverCoords = { latitude: parsedLat, longitude: parsedLng }
    const clientCoords = {
      latitude: parseFloat(visit.client_lat),
      longitude: parseFloat(visit.client_lng)
    }

    const geofenceResult = validateGeofence(caregiverCoords, clientCoords, 100)
    const suspiciousGPS = isSuspiciousGPS(accuracy)
    const isDuplicate = await checkDuplicateCheckin(pool, caregiverId)

    // 6. Log this GPS event regardless of outcome
    await pool.query(
      `INSERT INTO gps_logs
        (visit_id, user_id, latitude, longitude, accuracy, device_info, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [resolvedVisitId, caregiverId, parsedLat, parsedLng, accuracy || null, device_info || null]
    )

    // 7. Reject if outside geofence or suspicious GPS
    if (!geofenceResult.isInside) {
      // Create an alert for this failed attempt
      await pool.query(
        `INSERT INTO alerts
          (visit_id, alert_type, severity, description, evidence_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          resolvedVisitId,
          'location_mismatch',
          'high',
          `Caregiver attempted check-in ${geofenceResult.distance}m away from client location`,
          JSON.stringify({
            caregiver_coords: caregiverCoords,
            client_coords: clientCoords,
            distance: geofenceResult.distance,
            allowed_radius: geofenceResult.allowedRadius
          })
        ]
      )

      return res.status(400).json({
        message: 'Check-in rejected — you are too far from the client location',
        distance: geofenceResult.distance,
        allowed_radius: geofenceResult.allowedRadius,
        your_location: caregiverCoords,
        client_location: clientCoords
      })
    }

    if (suspiciousGPS) {
      await pool.query(
        `INSERT INTO alerts (visit_id, alert_type, severity, description, evidence_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          resolvedVisitId,
          'gps_spoofing',
          'critical',
          `GPS accuracy is ${accuracy}m — possible fake GPS or spoofing`,
          JSON.stringify({ accuracy, latitude: lat, longitude: lng })
        ]
      )

      return res.status(400).json({
        message: 'Check-in rejected — GPS signal is unreliable. Please move to an open area and try again.'
      })
    }

    if (isDuplicate) {
      await pool.query(
        `INSERT INTO alerts (visit_id, alert_type, severity, description)
         VALUES ($1, $2, $3, $4)`,
        [resolvedVisitId, 'suspicious_pattern', 'high', 'Multiple check-in attempts detected within 10 minutes']
      )
    }

    // 8. All checks passed — update the visit to in_progress
    const updatedVisit = await pool.query(
      `UPDATE visits SET
        status = 'in_progress',
        check_in_time = NOW(),
        check_in_latitude = $1,
        check_in_longitude = $2
       WHERE visit_id = $3
       RETURNING *`,
      [parsedLat, parsedLng, resolvedVisitId]
    )

    // 9. Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        caregiverId,
        'VISIT_CHECKIN',
        'visits',
        resolvedVisitId,
        JSON.stringify({
          latitude: parsedLat,
          longitude: parsedLng,
          distance_from_client: geofenceResult.distance,
          accuracy
        })
      ]
    )

    const v = updatedVisit.rows[0]
    const uiStatusMap = {
      pending: 'pending',
      in_progress: 'active',
      completed: 'completed',
      fraud_suspected: 'rejected'
    }
    res.json({
      message: '✅ Check-in successful',
      visit: {
        ...v,
        id: v.visit_id,
        ui_status: uiStatusMap[v.status] || v.status
      },
      distance_from_client: geofenceResult.distance,
      client_name: visit.client_name
    })

  } catch (error) {
    console.error('Check-in error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GPS CHECK-OUT ────────────────────────────────────────────────────────────
const checkOut = async (req, res) => {
  try {
    // visit id can come in the body (legacy) or as a URL param (/visits/:id/checkout)
    const {
      visit_id: body_visit_id,
      latitude,
      longitude,
      lat,
      lng,
      accuracy,
      device_info,
      notes
    } = req.body
    const visit_id = body_visit_id || req.params.id
    const resolvedLatitude = latitude ?? lat
    const resolvedLongitude = longitude ?? lng

    const caregiverId = req.user.userId

    if (!visit_id || resolvedLatitude == null || resolvedLongitude == null) {
      return res.status(400).json({
        message: 'Please provide visit_id, latitude and longitude'
      })
    }

    const parsedLat = parseFloat(resolvedLatitude)
    const parsedLng = parseFloat(resolvedLongitude)

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ message: 'Invalid GPS coordinates' })
    }

    // 1. Get the visit with all needed data
    const visitResult = await pool.query(
      `SELECT
        v.*,
        s.scheduled_start,
        s.scheduled_end,
        c.latitude AS client_lat,
        c.longitude AS client_lng,
        c.first_name || ' ' || c.last_name AS client_name
       FROM visits v
       JOIN schedules s ON v.schedule_id = s.schedule_id
       JOIN clients c ON v.client_id = c.client_id
       WHERE v.visit_id::text = $1::text OR v.schedule_id::text = $1::text`,
      [visit_id]
    )

    if (visitResult.rows.length === 0) {
      return res.status(404).json({ message: 'Visit not found' })
    }

    const visit = visitResult.rows[0]
    const resolvedVisitId = visit.visit_id

    // 2. Security checks
    if (visit.caregiver_id !== caregiverId) {
      return res.status(403).json({ message: 'This visit is not assigned to you' })
    }

    if (visit.status !== 'in_progress') {
      return res.status(400).json({
        message: `Cannot check out — visit status is: ${visit.status}`
      })
    }

    // 3. GPS validation at checkout location
    const caregiverCoords = { latitude: parsedLat, longitude: parsedLng }
    const clientCoords = {
      latitude: parseFloat(visit.client_lat),
      longitude: parseFloat(visit.client_lng)
    }

    const geofenceResult = validateGeofence(caregiverCoords, clientCoords, 100)

    // 4. Calculate visit duration
    const durationMinutes = calculateDuration(visit.check_in_time, new Date())

    // Calculate scheduled duration for comparison
    const scheduledDuration = calculateDuration(
      visit.scheduled_start,
      visit.scheduled_end
    )

    // 5. Check device consistency
    const deviceConsistent = checkDeviceConsistency(
      visit.check_in_device_info,
      device_info
    )

    // 6. Log GPS event
    await pool.query(
      `INSERT INTO gps_logs
        (visit_id, user_id, latitude, longitude, accuracy, device_info, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [resolvedVisitId, caregiverId, parsedLat, parsedLng, accuracy || null, device_info || null]
    )

    // 7. Run EVV verification engine
    const { evvStatus, alerts } = determineEVVStatus({
      isInsideGeofence: geofenceResult.isInside,
      isSuspiciousGPS: isSuspiciousGPS(accuracy),
      isDuplicateCheckin: false, // already checked at check-in
      isDeviceConsistent: deviceConsistent,
      durationMinutes,
      scheduledDurationMinutes: scheduledDuration
    })

    // 8. Save any alerts generated by EVV
    for (const alert of alerts) {
      await pool.query(
        `INSERT INTO alerts (visit_id, alert_type, severity, description, evidence_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          resolvedVisitId,
          alert.type,
          alert.severity,
          alert.message,
          JSON.stringify({
            duration_minutes: durationMinutes,
            scheduled_duration: scheduledDuration,
            checkout_coords: caregiverCoords,
            distance_from_client: geofenceResult.distance
          })
        ]
      )
    }

    // 9. Update the visit as completed
    const updatedVisit = await pool.query(
      `UPDATE visits SET
        status = $1,
        check_out_time = NOW(),
        check_out_latitude = $2,
        check_out_longitude = $3,
        notes = $4
       WHERE visit_id = $5
       RETURNING *`,
      [evvStatus, parsedLat, parsedLng, notes || null, resolvedVisitId]
    )

    // 10. Update the linked schedule as completed
    await pool.query(
      `UPDATE schedules SET status = 'completed'
       WHERE schedule_id = $1`,
      [visit.schedule_id]
    )

    // 11. Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        caregiverId,
        'VISIT_CHECKOUT',
        'visits',
        resolvedVisitId,
        JSON.stringify({
          duration_minutes: durationMinutes,
          evv_status: evvStatus,
          alerts_generated: alerts.length
        })
      ]
    )

    const v = updatedVisit.rows[0]
    // Map backend EVV/status codes to frontend-friendly labels
    const evvLabelMap = {
      completed: 'approved',
      fraud_suspected: 'rejected'
    }
    const uiStatusMap = {
      pending: 'pending',
      in_progress: 'active',
      completed: 'completed',
      fraud_suspected: 'rejected'
    }

    res.json({
      message: '✅ Check-out successful',
      visit: {
        ...v,
        id: v.visit_id,
        ui_status: uiStatusMap[v.status] || v.status,
        evv_status_label: evvLabelMap[evvStatus] || evvStatus
      },
      evv_status: evvStatus,
      duration_minutes: durationMinutes,
      alerts_generated: alerts.length,
      ...(alerts.length > 0 && { alerts_summary: alerts.map(a => a.message) })
    })

  } catch (error) {
    console.error('Check-out error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET VISIT DETAILS ────────────────────────────────────────────────────────
const getVisitById = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT
        v.*,
        u.full_name AS caregiver_name,
        u.email AS caregiver_email,
        c.first_name || ' ' || c.last_name AS client_name,
        c.address AS client_address,
        s.scheduled_start,
        s.scheduled_end
       FROM visits v
       JOIN users u ON v.caregiver_id = u.user_id
       JOIN clients c ON v.client_id = c.client_id
       JOIN schedules s ON v.schedule_id = s.schedule_id
       WHERE v.visit_id::text = $1::text OR v.schedule_id::text = $1::text`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Visit not found' })
    }

    // Get GPS logs for this visit
    const resolvedVisitId = result.rows[0].visit_id

    const gpsLogs = await pool.query(
      `SELECT * FROM gps_logs WHERE visit_id = $1 ORDER BY captured_at ASC`,
      [resolvedVisitId]
    )

    // Get alerts for this visit
    const alerts = await pool.query(
      `SELECT * FROM alerts WHERE visit_id = $1 ORDER BY created_at ASC`,
      [resolvedVisitId]
    )

    res.json({
      visit: result.rows[0],
      gps_logs: gpsLogs.rows,
      alerts: alerts.rows
    })

  } catch (error) {
    console.error('Get visit error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET ALL VISITS (admin) ───────────────────────────────────────────────────
const getAllVisits = async (req, res) => {
  try {
    const { status, caregiver_id, client_id, date_from, date_to } = req.query

    let query = `
      SELECT
        v.visit_id,
        v.status,
        v.check_in_time,
        v.check_out_time,
        v.notes,
        v.created_at,
        u.full_name AS caregiver_name,
        c.first_name || ' ' || c.last_name AS client_name,
        s.scheduled_start,
        s.scheduled_end
       FROM visits v
       JOIN users u ON v.caregiver_id = u.user_id
       JOIN clients c ON v.client_id = c.client_id
       JOIN schedules s ON v.schedule_id = s.schedule_id
       WHERE 1=1
    `

    const params = []
    let paramCount = 1

    if (status) {
      query += ` AND v.status = $${paramCount}`
      params.push(status)
      paramCount++
    }

    if (caregiver_id) {
      query += ` AND v.caregiver_id = $${paramCount}`
      params.push(caregiver_id)
      paramCount++
    }

    if (client_id) {
      query += ` AND v.client_id = $${paramCount}`
      params.push(client_id)
      paramCount++
    }

    if (date_from) {
      query += ` AND v.check_in_time >= $${paramCount}`
      params.push(date_from)
      paramCount++
    }

    if (date_to) {
      query += ` AND v.check_in_time <= $${paramCount}`
      params.push(date_to)
      paramCount++
    }

    query += ' ORDER BY v.created_at DESC'

    const result = await pool.query(query, params)

    res.json({
      message: 'Visits retrieved successfully',
      count: result.rows.length,
      visits: result.rows
    })

  } catch (error) {
    console.error('Get visits error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET ACTIVE VISITS (for dashboard) ─────────────────────────────────────
const getActiveVisits = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        v.visit_id,
        v.status,
        v.check_in_time,
        v.check_out_time,
        v.check_in_latitude AS checkin_lat,
        v.check_in_longitude AS checkin_lng,
        u.full_name AS caregiver_name,
        c.first_name || ' ' || c.last_name AS client_name,
        s.scheduled_start
       FROM visits v
       JOIN users u ON v.caregiver_id = u.user_id
       JOIN clients c ON v.client_id = c.client_id
       JOIN schedules s ON v.schedule_id = s.schedule_id
       WHERE v.status = 'in_progress' OR v.status = 'active'
       ORDER BY v.check_in_time DESC`
    )

    res.json({ message: 'Active visits', count: result.rows.length, visits: result.rows })
  } catch (error) {
    console.error('Get active visits error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { checkIn, checkOut, getVisitById, getAllVisits, getActiveVisits }