const pool = require('../db')

// ─── CREATE SCHEDULE (admin only) ────────────────────────────────────────────
const createSchedule = async (req, res) => {
  try {
    let {
      caregiver_id,
      client_id,
      scheduled_start,
      scheduled_end,
      notes,
      // support frontend-friendly fields
      visit_date,
      start_time,
      end_time
    } = req.body

    // If frontend supplies date + time pieces, build scheduled_start/ end
    if (!scheduled_start && visit_date && start_time) {
      scheduled_start = new Date(`${visit_date}T${start_time}`)
    }
    if (!scheduled_end && visit_date && end_time) {
      // if end_time is earlier than start_time, assume same day
      scheduled_end = new Date(`${visit_date}T${end_time}`)
    }

    // 1. Validate required fields
    if (!caregiver_id || !client_id || !scheduled_start || !scheduled_end) {
      return res.status(400).json({
        message: 'Please provide caregiver_id, client_id, scheduled_start and scheduled_end'
      })
    }

    // 2. Make sure end time is after start time
    const start = new Date(scheduled_start)
    const end = new Date(scheduled_end)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' })
    }

    if (end <= start) {
      return res.status(400).json({ message: 'scheduled_end must be after scheduled_start' })
    }

    // 3. Verify the caregiver exists and has the right role
    const caregiverCheck = await pool.query(
      'SELECT user_id, role, is_active FROM users WHERE user_id = $1',
      [caregiver_id]
    )

    if (caregiverCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Caregiver not found' })
    }

    if (caregiverCheck.rows[0].role !== 'caregiver') {
      return res.status(400).json({ message: 'Selected user is not a caregiver' })
    }

    if (!caregiverCheck.rows[0].is_active) {
      return res.status(400).json({ message: 'Caregiver account is deactivated' })
    }

    // 4. Verify the client exists and is active
    const clientCheck = await pool.query(
      'SELECT client_id, is_active FROM clients WHERE client_id = $1',
      [client_id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    if (!clientCheck.rows[0].is_active) {
      return res.status(400).json({ message: 'Client is deactivated' })
    }

    // 5. Check for scheduling conflicts
    // Make sure the caregiver doesn't already have a visit at this time
    const conflictCheck = await pool.query(
      `SELECT schedule_id FROM schedules
       WHERE caregiver_id = $1
       AND status NOT IN ('cancelled')
       AND (
         (scheduled_start <= $2 AND scheduled_end > $2) OR
         (scheduled_start < $3 AND scheduled_end >= $3) OR
         (scheduled_start >= $2 AND scheduled_end <= $3)
       )`,
      [caregiver_id, scheduled_start, scheduled_end]
    )

    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({
        message: 'Caregiver already has a schedule during this time slot'
      })
    }

    // 6. Create the schedule
    const result = await pool.query(
      `INSERT INTO schedules
        (caregiver_id, client_id, scheduled_start, scheduled_end, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [caregiver_id, client_id, scheduled_start, scheduled_end, notes || null]
    )

    const newSchedule = result.rows[0]

    // 7. Also create a visit record linked to this schedule
    // The visit starts as 'pending' until the caregiver checks in
    await pool.query(
      `INSERT INTO visits (schedule_id, caregiver_id, client_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [newSchedule.schedule_id, caregiver_id, client_id]
    )

    // 8. Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.userId,
        'SCHEDULE_CREATED',
        'schedules',
        newSchedule.schedule_id,
        JSON.stringify(newSchedule)
      ]
    )

    // map to frontend-friendly shape
    const sched = {
      ...newSchedule,
      id: newSchedule.schedule_id,
      visit_date: new Date(newSchedule.scheduled_start).toISOString().split('T')[0],
      start_time: new Date(newSchedule.scheduled_start).toTimeString().split(' ')[0].slice(0,5),
      end_time: new Date(newSchedule.scheduled_end).toTimeString().split(' ')[0].slice(0,5)
    }

    res.status(201).json({
      message: 'Schedule created successfully',
      schedule: sched
    })

  } catch (error) {
    console.error('Create schedule error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET ALL SCHEDULES (admin view) ──────────────────────────────────────────
const getAllSchedules = async (req, res) => {
  try {
    const { status, date } = req.query

    // Build query with optional filters
    // We JOIN users and clients to get their names in one query
    let query = `
      SELECT
        s.schedule_id,
        s.scheduled_start,
        s.scheduled_end,
        s.status,
        s.notes,
        s.created_at,
        u.full_name AS caregiver_name,
        u.email AS caregiver_email,
        u.phone AS caregiver_phone,
        c.first_name || ' ' || c.last_name AS client_name,
        c.address AS client_address
      FROM schedules s
      JOIN users u ON s.caregiver_id = u.user_id
      JOIN clients c ON s.client_id = c.client_id
      WHERE 1=1
    `

    const params = []
    let paramCount = 1

    // Filter by status if provided
    if (status) {
      query += ` AND s.status = $${paramCount}`
      params.push(status)
      paramCount++
    }

    // Filter by specific date if provided (format: YYYY-MM-DD)
    if (date) {
      query += ` AND DATE(s.scheduled_start) = $${paramCount}`
      params.push(date)
      paramCount++
    }

    query += ' ORDER BY s.scheduled_start ASC'

    const result = await pool.query(query, params)

    const schedules = result.rows.map(s => ({
      ...s,
      id: s.visit_id || s.schedule_id,
      schedule_id: s.schedule_id,
      visit_id: s.visit_id,
      visit_date: new Date(s.scheduled_start).toISOString().split('T')[0],
      start_time: new Date(s.scheduled_start).toTimeString().split(' ')[0].slice(0,5),
      end_time: new Date(s.scheduled_end).toTimeString().split(' ')[0].slice(0,5)
    }))

    res.json({
      message: 'Schedules retrieved successfully',
      count: schedules.length,
      schedules
    })

  } catch (error) {
    console.error('Get schedules error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET CAREGIVER SCHEDULES ──────────────────────────────────────────────────
const getCaregiverSchedules = async (req, res) => {
  try {
    const { id } = req.params

    // Security check: caregivers can only see their own schedules
    // Admins can see any caregiver's schedules
    if (req.user.role === 'caregiver' && req.user.userId !== id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      `SELECT
        s.schedule_id,
        s.scheduled_start,
        s.scheduled_end,
        s.status,
        s.notes,
        c.first_name || ' ' || c.last_name AS client_name,
        c.address AS client_address,
        c.latitude AS client_latitude,
        c.longitude AS client_longitude,
        c.phone AS client_phone,
        v.visit_id,
        v.status AS visit_status,
        v.check_in_time,
        v.check_out_time
       FROM schedules s
       JOIN clients c ON s.client_id = c.client_id
       LEFT JOIN visits v ON v.schedule_id = s.schedule_id
       WHERE s.caregiver_id = $1
       AND s.scheduled_start >= NOW() - INTERVAL '1 day'
       ORDER BY s.scheduled_start ASC`,
      [id]
    )

    const schedules = result.rows.map(s => ({
      ...s,
      id: s.schedule_id,
      visit_date: new Date(s.scheduled_start).toISOString().split('T')[0],
      start_time: new Date(s.scheduled_start).toTimeString().split(' ')[0].slice(0,5),
      end_time: new Date(s.scheduled_end).toTimeString().split(' ')[0].slice(0,5)
    }))

    res.json({
      message: 'Caregiver schedules retrieved',
      count: schedules.length,
      schedules
    })

  } catch (error) {
    console.error('Get caregiver schedules error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── UPDATE SCHEDULE STATUS (admin only) ─────────────────────────────────────
const updateScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['scheduled', 'completed', 'cancelled', 'missed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' })
    }

    const result = await pool.query(
      `UPDATE schedules SET status = $1
       WHERE schedule_id = $2
       RETURNING *`,
      [status, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' })
    }

    res.json({
      message: 'Schedule updated successfully',
      schedule: result.rows[0]
    })

  } catch (error) {
    console.error('Update schedule error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── DELETE SCHEDULE (admin only) ────────────────────────────────────────────
const deleteSchedule = async (req, res) => {
  let client

  try {
    client = await pool.connect()
    const { id } = req.params

    await client.query('BEGIN')

    const scheduleResult = await client.query(
      `SELECT schedule_id, caregiver_id, client_id, scheduled_start, scheduled_end, status, notes
       FROM schedules
       WHERE schedule_id = $1`,
      [id]
    )

    if (scheduleResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Schedule not found' })
    }

    const schedule = scheduleResult.rows[0]

    await client.query(
      `DELETE FROM gps_logs
       WHERE visit_id IN (SELECT visit_id FROM visits WHERE schedule_id = $1)`,
      [id]
    )

    await client.query(
      `DELETE FROM alerts
       WHERE visit_id IN (SELECT visit_id FROM visits WHERE schedule_id = $1)`,
      [id]
    )

    await client.query('DELETE FROM visits WHERE schedule_id = $1', [id])

    await client.query('DELETE FROM schedules WHERE schedule_id = $1', [id])

    await client.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.userId,
        'SCHEDULE_DELETED',
        'schedules',
        id,
        JSON.stringify({
          ...schedule,
        })
      ]
    )

    await client.query('COMMIT')

    res.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK')
    }
    console.error('Delete schedule error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  } finally {
    if (client) {
      client.release()
    }
  }
}

module.exports = {
  createSchedule,
  getAllSchedules,
  getCaregiverSchedules,
  updateScheduleStatus,
  deleteSchedule
}