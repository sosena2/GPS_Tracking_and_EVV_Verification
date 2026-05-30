import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Layout from '../../components/Layout'
import api from '../../api/axios'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const LocationPicker = ({ onPick }) => {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

const emptyForm = {
  first_name: '', last_name: '', address: '',
  latitude: '', longitude: '', phone: '',
  emergency_contact: '', emergency_phone: ''
}

const Clients = () => {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [marker, setMarker] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients')
      setClients(res.data.clients)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleMapPick = (lat, lng) => {
    setMarker([lat, lng])
    setForm(f => ({ ...f, latitude: lat.toFixed(8), longitude: lng.toFixed(8) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/clients', form)
      showToast('Client created successfully')
      setShowForm(false)
      setForm(emptyForm)
      setMarker(null)
      fetchClients()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create client', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Clients">

      {/* Toast */}
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
          <h2 className="text-xl font-bold text-slate-800">Clients</h2>
          <p className="text-slate-500 text-sm">{clients.length} registered clients</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Client'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-5">New Client</h3>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required />
              <Input label="Last Name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} required />
              <Input label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
              <Input label="Emergency Contact" value={form.emergency_contact} onChange={v => setForm({ ...form, emergency_contact: v })} />
              <Input label="Emergency Phone" value={form.emergency_phone} onChange={v => setForm({ ...form, emergency_phone: v })} />
            </div>

            <Input label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} required />

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                📍 Click the map to set client location
              </p>
              <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
                <MapContainer center={[9.0192, 38.7525]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker onPick={handleMapPick} />
                  {marker && <Marker position={marker} />}
                </MapContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" value={form.latitude} onChange={v => setForm({ ...form, latitude: v })} required />
              <Input label="Longitude" value={form.longitude} onChange={v => setForm({ ...form, longitude: v })} required />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">No clients yet. Add your first client.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Address', 'Phone', 'GPS Coordinates', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map(c => (
                <tr key={c.client_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{c.address}</td>
                  <td className="px-5 py-4 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">
                    {parseFloat(c.latitude).toFixed(4)}, {parseFloat(c.longitude).toFixed(4)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
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

const Input = ({ label, value, onChange, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
)

export default Clients