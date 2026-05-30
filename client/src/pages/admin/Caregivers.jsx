import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/axios'

const emptyForm = { full_name: '', email: '', password: '', phone: '' }

const Caregivers = () => {
  const [caregivers, setCaregivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchCaregivers() }, [])

  const fetchCaregivers = async () => {
    try {
      const res = await api.get('/auth/users')
      setCaregivers(res.data.users.filter(u => u.role === 'caregiver'))
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
      await api.post('/auth/register', { ...form, role: 'caregiver' })
      showToast('Caregiver created successfully')
      setShowForm(false)
      setForm(emptyForm)
      fetchCaregivers()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create caregiver', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Caregivers">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Caregivers</h2>
          <p className="text-slate-500 text-sm">{caregivers.length} registered caregivers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Caregiver'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-5">New Caregiver</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} required />
              <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
              <Input label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
              <Input label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2 rounded-lg"
              >
                {saving ? 'Saving...' : 'Create Caregiver'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Loading...</div>
        ) : caregivers.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">No caregivers yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Email', 'Phone', 'Status', 'Joined'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {caregivers.map(c => (
                <tr key={c.user_id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-800">{c.full_name}</td>
                  <td className="px-5 py-4 text-slate-600">{c.email}</td>
                  <td className="px-5 py-4 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
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

const Input = ({ label, value, onChange, required, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
)

export default Caregivers