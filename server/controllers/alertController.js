const pool = require('../db')

// ─── GET ALL ALERTS (admin) ───────────────────────────────────────────────────
const getAllAlerts = async (req, res) => {
  try {
    const { severity, is_resolved, alert_type } = req.query

    let query = `
      SELECT
        a.*,
        v.check_in_time,
        v.check_out_time,
        u.full_name AS caregiver_name,
        c.first_name || ' ' || c.last_name AS client_name
       FROM alerts a
       LEFT JOIN visits v ON a.visit_id = v.visit_id
       LEFT JOIN users u ON v.caregiver_id = u.user_id
       LEFT JOIN clients c ON v.client_id = c.client_id
       WHERE 1=1
    `

    const params = []
    let paramCount = 1

    if (severity) {
      query += ` AND a.severity = $${paramCount}`
      params.push(severity)
      paramCount++
    }

    if (is_resolved !== undefined) {
      query += ` AND a.is_resolved = $${paramCount}`
      params.push(is_resolved === 'true')
      paramCount++
    }

    if (alert_type) {
      query += ` AND a.alert_type = $${paramCount}`
      params.push(alert_type)
      paramCount++
    }

    query += ' ORDER BY a.created_at DESC'

    const result = await pool.query(query, params)

    res.json({
      message: 'Alerts retrieved successfully',
      count: result.rows.length,
      alerts: result.rows
    })

  } catch (error) {
    console.error('Get alerts error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── RESOLVE ALERT (admin only) ───────────────────────────────────────────────
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `UPDATE alerts SET
        is_resolved = true,
        resolved_by = $1,
        resolved_at = NOW()
       WHERE alert_id = $2
       RETURNING *`,
      [req.user.userId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Alert not found' })
    }

    res.json({
      message: 'Alert resolved',
      alert: result.rows[0]
    })

  } catch (error) {
    console.error('Resolve alert error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
const getDailyReport = async (req, res) => {
  try {
    const { date_from, date_to } = req.query

    if (!date_from || !date_to) {
      return res.status(400).json({ message: 'Please provide date_from and date_to (YYYY-MM-DD)' })
    }

    // Summary counts
    const summary = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_visits,
        COUNT(*) FILTER (WHERE status = 'missed') AS missed_visits,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS active_visits,
        COUNT(*) FILTER (WHERE status = 'fraud_suspected') AS fraud_visits,
        COUNT(*) AS total_visits,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60
        )::numeric, 1) AS avg_duration_minutes
       FROM visits
       WHERE check_in_time BETWEEN $1 AND $2`,
      [date_from, date_to + ' 23:59:59']
    )

    // Per caregiver breakdown
    const caregiverBreakdown = await pool.query(
      `SELECT
        u.full_name AS caregiver_name,
        COUNT(*) FILTER (WHERE v.status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE v.status = 'missed') AS missed,
        COUNT(*) FILTER (WHERE v.status = 'fraud_suspected') AS flagged,
        COUNT(*) AS total
       FROM visits v
       JOIN users u ON v.caregiver_id = u.user_id
       WHERE v.check_in_time BETWEEN $1 AND $2
       GROUP BY u.user_id, u.full_name
       ORDER BY total DESC`,
      [date_from, date_to + ' 23:59:59']
    )

    // Alert summary
    const alertSummary = await pool.query(
      `SELECT
        alert_type,
        severity,
        COUNT(*) AS count
       FROM alerts
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY alert_type, severity
       ORDER BY count DESC`,
      [date_from, date_to + ' 23:59:59']
    )

    // Daily breakdown
    const dailyBreakdown = await pool.query(
      `SELECT
        DATE(check_in_time) AS date,
        COUNT(*) AS total_visits,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'fraud_suspected') AS flagged
       FROM visits
       WHERE check_in_time BETWEEN $1 AND $2
       GROUP BY DATE(check_in_time)
       ORDER BY date ASC`,
      [date_from, date_to + ' 23:59:59']
    )

    res.json({
      report_period: { from: date_from, to: date_to },
      summary: summary.rows[0],
      caregiver_breakdown: caregiverBreakdown.rows,
      alert_summary: alertSummary.rows,
      daily_breakdown: dailyBreakdown.rows
    })

  } catch (error) {
    console.error('Report error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── VISIT REPORT (frontend expects /reports/visits) ─────────────────────────
const getVisitReport = async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ message: 'Please provide from and to (YYYY-MM-DD)' })

    const result = await pool.query(
      `SELECT
        v.visit_id AS id,
        u.full_name AS caregiver_name,
        c.first_name || ' ' || c.last_name AS client_name,
        DATE(v.check_in_time) AS visit_date,
        v.check_in_time AS checkin_time,
        v.check_out_time AS checkout_time,
        ROUND(EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time))/60)::int AS duration_mins,
        v.status
       FROM visits v
       JOIN users u ON v.caregiver_id = u.user_id
       JOIN clients c ON v.client_id = c.client_id
       WHERE v.check_in_time BETWEEN $1 AND $2
       ORDER BY v.check_in_time DESC`,
      [from, to + ' 23:59:59']
    )

    res.json(result.rows)
  } catch (error) {
    console.error('getVisitReport error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── FRAUD REPORT (frontend expects /reports/fraud) ────────────────────────
const getFraudReport = async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ message: 'Please provide from and to (YYYY-MM-DD)' })

    const result = await pool.query(
      `SELECT
        a.alert_id AS id,
        u.full_name AS caregiver_name,
        a.alert_type,
        a.description AS message,
        a.created_at
       FROM alerts a
       LEFT JOIN visits v ON a.visit_id = v.visit_id
       LEFT JOIN users u ON v.caregiver_id = u.user_id
       WHERE a.created_at BETWEEN $1 AND $2
       ORDER BY a.created_at DESC`,
      [from, to + ' 23:59:59']
    )

    res.json(result.rows)
  } catch (error) {
    console.error('getFraudReport error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── ATTENDANCE REPORT (frontend expects /reports/attendance) ─────────────
const getAttendanceReport = async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ message: 'Please provide from and to (YYYY-MM-DD)' })

    const result = await pool.query(
      `SELECT
        u.full_name AS caregiver_name,
        COUNT(*) AS total_visits,
        COUNT(*) FILTER (WHERE v.status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE v.status = 'missed') AS missed,
        ROUND(AVG(EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time))/60)::numeric,1) AS avg_duration
       FROM visits v
       JOIN users u ON v.caregiver_id = u.user_id
       WHERE v.check_in_time BETWEEN $1 AND $2
       GROUP BY u.user_id, u.full_name
       ORDER BY total_visits DESC`,
      [from, to + ' 23:59:59']
    )

    res.json(result.rows)
  } catch (error) {
    console.error('getAttendanceReport error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getAllAlerts,
  resolveAlert,
  getDailyReport,
  getVisitReport,
  getFraudReport,
  getAttendanceReport
}