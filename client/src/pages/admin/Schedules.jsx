import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/axios'

const emptyForm = {
  caregiver_id: '',
  client_id: '',
  scheduled_start: '',
  scheduled_end: '',
  notes: ''
}

const Schedules = () => {
  const [schedules, setSchedules] = useState([])
  const [caregivers, setCaregivers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [schedulesRes, usersRes, clientsRes] = await Promise.all([
        api.get('/schedules/admin'),
        api.get('/auth/users'),
        api.get('/clients')
      ])
      setSchedules(schedulesRes.data.schedules)
      setCaregivers(usersRes.data.users.filter(u => u.role === 'caregiver'))
      setClients(clientsRes.data.clients.filter(c => c.is_active))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/schedules', form)
      showToast('Schedule created successfully')
      setShowForm(false)
      setForm(emptyForm)
      fetchAll()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create schedule', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = statusFilter
    ? schedules.filter(s => s.status === statusFilter)
    : schedules

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    missed: 'bg-slate-100 text-slate-600'
  }

  return (
    <Layout title="Schedules">

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Schedules</h2>
          <p className="text-slate-500 text-sm">{schedules.length} total schedules</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Assign Visit'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-5">Assign Visit</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Caregiver <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.caregiver_id}
                  onChange={e => setForm({ ...form, caregiver_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select caregiver...</option>
                  {caregivers.map(c => (
                    <option key={c.user_id} value={c.user_id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.client_id}
                  onChange={e => setForm({ ...form, client_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_start}
                  onChange={e => setForm({ ...form, scheduled_start: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_end}
                  onChange={e => setForm({ ...form, scheduled_end: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex gap-2 mb-4">
        {['', 'scheduled', 'completed', 'missed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            Loading schedules...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            No schedules found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Caregiver', 'Client', 'Start', 'End', 'Status', 'Notes'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.schedule_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-800">{s.caregiver_name}</td>
                  <td className="px-5 py-4 text-slate-600">{s.client_name}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {new Date(s.scheduled_start).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {new Date(s.scheduled_end).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      statusColors[s.status] || 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 max-w-xs truncate">
                    {s.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}

export default Schedules