import { useEffect, useState } from 'react'
import { Plus, UserPlus, Pencil, Trash2 } from 'lucide-react'
import api, { getCaregivers, updateCaregiver, deleteCaregiver } from '../../services/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import toast from 'react-hot-toast'

const empty = { full_name: '', email: '', phone: '', password: '' }

export default function Caregivers() {
  const [form, setForm] = useState(empty)
  const [editingCaregiver, setEditingCaregiver] = useState(null)
  const [loading, setLoading] = useState(false)
  const [caregivers, setCaregivers] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [modal, setModal] = useState(false)

  const asArray = (value) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.caregivers)) return value.caregivers
    if (Array.isArray(value?.data?.caregivers)) return value.data.caregivers
    return []
  }

  useEffect(() => {
    document.title = 'Caregivers'
  }, [])

  // Load caregivers on mount
  useEffect(() => {
    const fetchCaregivers = async () => {
      setListLoading(true)
      try {
        const { data } = await getCaregivers()
        console.log('[Caregivers] Loaded:', data)
        setCaregivers(asArray(data))
      } catch (error) {
        console.error('[Caregivers] Load error:', error)
        toast.error('Failed to load caregivers')
      } finally {
        setListLoading(false)
      }
    }
    fetchCaregivers()
  }, [])

  // Function to reload caregivers (called after form submission)
  const loadCaregivers = async () => {
    setListLoading(true)
    try {
      const { data } = await getCaregivers()
      console.log('[Caregivers] Reloaded:', data)
      setCaregivers(asArray(data))
    } catch (error) {
      console.error('[Caregivers] Reload error:', error)
      toast.error('Failed to reload caregivers')
    } finally {
      setListLoading(false)
    }
  }

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (editingCaregiver) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await updateCaregiver(editingCaregiver.id, payload)
        toast.success('Caregiver updated successfully')
      } else {
        await api.post('/auth/register', { ...form, role: 'caregiver' })
        toast.success('Caregiver created successfully')
      }
      setForm(empty)
      setEditingCaregiver(null)
      setModal(false)
      // Reload the list after successful creation
      await loadCaregivers()
    } catch (error) {
      console.error('[Caregivers] Creation error:', error)
      toast.error(error.response?.data?.message || 'Failed to create caregiver')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (caregiver) => {
    setEditingCaregiver(caregiver)
    setForm({
      full_name: caregiver.full_name || caregiver.name || '',
      email: caregiver.email || '',
      phone: caregiver.phone || '',
      password: '',
    })
    setModal(true)
  }

  const handleDelete = async (caregiver) => {
    if (!confirm(`Delete ${caregiver.full_name || caregiver.name}?`)) return

    try {
      await deleteCaregiver(caregiver.id)
      toast.success('Caregiver deleted successfully')
      await loadCaregivers()
    } catch (error) {
      console.error('[Caregivers] Delete error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete caregiver')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'is_active', label: 'Status', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            title="Edit caregiver"
            aria-label="Edit caregiver"
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 p-2 text-gray-200 hover:border-primary-500 hover:text-white transition"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            title="Delete caregiver"
            aria-label="Delete caregiver"
            className="inline-flex items-center justify-center rounded-lg border border-red-900/60 p-2 text-red-300 hover:border-red-500 hover:text-red-200 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Caregivers</h1>
          <p className="text-gray-400 text-sm mt-1">Manage caregiver accounts and add new staff members.</p>
        </div>
        <Button onClick={() => setModal(true)} className="w-full sm:w-auto">
          <Plus size={16} />
          Add Caregiver
        </Button>
      </div>

      <Card className="p-0">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Existing Caregivers</h2>
          <p className="text-xs text-gray-400 mt-0.5">{caregivers.length} total caregiver{caregivers.length !== 1 ? 's' : ''}</p>
        </div>
        <Table columns={columns} data={caregivers} loading={listLoading} />
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditingCaregiver(null); setForm(empty) }} title={editingCaregiver ? 'Edit Caregiver' : 'Create Caregiver'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Jane Doe' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@example.com' },
            { label: 'Phone', key: 'phone', type: 'text', placeholder: '+1 234 567 8900' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={handleChange(key)}
                placeholder={placeholder}
                required={key !== 'password' || !editingCaregiver}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              <UserPlus size={16} />
              {editingCaregiver ? 'Save Changes' : 'Create Caregiver'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
