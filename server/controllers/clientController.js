const pool = require('../db')

// ─── CREATE CLIENT (admin only) ───────────────────────────────────────────────
const createClient = async (req, res) => {
  try {
    let {
      first_name,
      last_name,
      name,
      address,
      latitude,
      longitude,
      phone,
      emergency_contact,
      emergency_phone
    } = req.body

    // Support a single `name` field from the frontend; split into first/last
    if (name && (!first_name || !last_name)) {
      const parts = name.trim().split(/\s+/)
      first_name = parts.shift()
      last_name = parts.join(' ') || ''
    }

    // 1. Validate required fields
    if (!first_name || !last_name || !address || !latitude || !longitude) {
      return res.status(400).json({
        message: 'Please provide first_name, last_name, address, latitude and longitude'
      })
    }

    // 2. Validate GPS coordinates are real numbers
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Latitude and longitude must be valid numbers' })
    }

    // 3. Validate coordinate ranges
    // Latitude must be between -90 and 90
    // Longitude must be between -180 and 180
    if (lat < -90 || lat > 90) {
      return res.status(400).json({ message: 'Latitude must be between -90 and 90' })
    }
    if (lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Longitude must be between -180 and 180' })
    }

    // 4. Insert client into the database
    const result = await pool.query(
      `INSERT INTO clients 
        (first_name, last_name, address, latitude, longitude, phone, emergency_contact, emergency_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [first_name, last_name, address, lat, lng, phone || null, emergency_contact || null, emergency_phone || null]
    )

    const newClient = result.rows[0]

    // 5. Log this action
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'CLIENT_CREATED', 'clients', newClient.client_id]
    )

    // Add convenience fields for frontend
    const clientForFrontend = { ...newClient, id: newClient.client_id, name: `${newClient.first_name} ${newClient.last_name}` }
    res.status(201).json({
      message: 'Client created successfully',
      client: clientForFrontend
    })

  } catch (error) {
    console.error('Create client error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET ALL CLIENTS ──────────────────────────────────────────────────────────
const getAllClients = async (req, res) => {
  try {
    // Optional: filter by active only using query param
    // Example: GET /clients?active=true
    const { active } = req.query
    const activeFilter = active ?? 'true'

    let query = 'SELECT * FROM clients'
    let params = []

    if (activeFilter === 'true') {
      query += ' WHERE is_active = true'
    } else if (activeFilter === 'false') {
      query += ' WHERE is_active = false'
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)

    // map to frontend-friendly shape
    const clients = result.rows.map(r => ({ ...r, id: r.client_id, name: `${r.first_name} ${r.last_name}` }))
    res.json({
      message: 'Clients retrieved successfully',
      count: clients.length,
      clients
    })

  } catch (error) {
    console.error('Get clients error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── GET ONE CLIENT ───────────────────────────────────────────────────────────
const getClientById = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'SELECT * FROM clients WHERE client_id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const c = result.rows[0]
    res.json({
      message: 'Client retrieved successfully',
      client: { ...c, id: c.client_id, name: `${c.first_name} ${c.last_name}` }
    })

  } catch (error) {
    console.error('Get client error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── UPDATE CLIENT (admin only) ───────────────────────────────────────────────
const updateClient = async (req, res) => {
  try {
    const { id } = req.params
    const {
      first_name,
      last_name,
      address,
      latitude,
      longitude,
      phone,
      emergency_contact,
      emergency_phone,
      is_active
    } = req.body

    // Check client exists first
    const existing = await pool.query(
      'SELECT * FROM clients WHERE client_id = $1',
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const oldClient = existing.rows[0]

    // Validate coordinates if they're being updated
    if (latitude !== undefined || longitude !== undefined) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: 'Invalid GPS coordinates' })
      }
    }

    const result = await pool.query(
      `UPDATE clients SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        address = COALESCE($3, address),
        latitude = COALESCE($4, latitude),
        longitude = COALESCE($5, longitude),
        phone = COALESCE($6, phone),
        emergency_contact = COALESCE($7, emergency_contact),
        emergency_phone = COALESCE($8, emergency_phone),
        is_active = COALESCE($9, is_active)
       WHERE client_id = $10
       RETURNING *`,
      [first_name, last_name, address, latitude, longitude,
       phone, emergency_contact, emergency_phone, is_active, id]
    )

    // Log the update with old and new values
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.userId,
        'CLIENT_UPDATED',
        'clients',
        id,
        JSON.stringify(oldClient),
        JSON.stringify(result.rows[0])
      ]
    )

    const updated = result.rows[0]
    res.json({
      message: 'Client updated successfully',
      client: { ...updated, id: updated.client_id, name: `${updated.first_name} ${updated.last_name}` }
    })

  } catch (error) {
    console.error('Update client error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── DEACTIVATE CLIENT (admin only) ──────────────────────────────────────────
// We never hard-delete clients — we just deactivate them
// This protects historical visit and GPS records
const deactivateClient = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `UPDATE clients SET is_active = false
       WHERE client_id = $1
       RETURNING client_id, first_name, last_name, is_active`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'CLIENT_DEACTIVATED', 'clients', id]
    )

    const c2 = result.rows[0]
    res.json({
      message: 'Client deactivated successfully',
      client: { ...c2, id: c2.client_id, name: `${c2.first_name} ${c2.last_name}` }
    })

  } catch (error) {
    console.error('Deactivate client error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deactivateClient
}