import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getClients, createClient, updateClient, deleteClient } from '../../services/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import toast from 'react-hot-toast'

const empty = { name: '', address: '', phone: '', latitude: '', longitude: '' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(empty)
  const [saving,  setSaving]  = useState(false)

  const asArray = (value) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.clients)) return value.clients
    if (Array.isArray(value?.data?.clients)) return value.data.clients
    return []
  }

  const normalizeClient = (client) => {
    if (!client) return null

    const fullName = client.name || [client.first_name, client.last_name].filter(Boolean).join(' ').trim()

    return {
      ...client,
      id: client.id ?? client.client_id,
      name: fullName,
    }
  }

  const buildPayload = (values) => {
    const parts = values.name.trim().split(/\s+/).filter(Boolean)
    const first_name = parts.shift() || ''
    const last_name = parts.join(' ')

    return {
      first_name,
      last_name,
      address: values.address,
      phone: values.phone,
      latitude: values.latitude,
      longitude: values.longitude,
    }
  }

  const load = useCallback(async () => {
    try {
      const { data } = await getClients()
      setClients(asArray(data).map(normalizeClient))
    } catch (err) {
      console.error('Failed to load clients:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const fetchClients = async () => {
      try {
        const { data } = await getClients()
        if (active) {
          setClients(asArray(data).map(normalizeClient))
        }
      } catch (err) {
        console.error('Failed to load clients:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchClients()

    return () => {
      active = false
    }
  }, [])

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true) }
  const openEdit   = (c) => {
    const normalized = normalizeClient(c)
    setEditing(normalized)
    setForm({
      name: normalized.name,
      address: normalized.address,
      phone: normalized.phone,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
    })
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = buildPayload(form)

      if (editing) {
        const { data } = await updateClient(editing.id, payload)
        const saved = normalizeClient(data?.client)
        if (saved) {
          setClients((current) => current.map((client) => (client.id === saved.id ? saved : client)))
        }
        toast.success('Client updated')
      } else {
        const { data } = await createClient(payload)
        const saved = normalizeClient(data?.client)
        if (saved) {
          setClients((current) => [saved, ...current])
        }
        toast.success('Client created')
      }
      setModal(false)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving client')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return
    try {
      await deleteClient(id)
      toast.success('Client deleted')
      load()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete')
    }
  }

  const columns = [
    { key: 'name',      label: 'Name' },
    { key: 'address',   label: 'Address' },
    { key: 'phone',     label: 'Phone' },
    { key: 'latitude',  label: 'Lat' },
    { key: 'longitude', label: 'Lng' },
    {
      key: 'actions', label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(row)} className="text-gray-400 hover:text-white transition-colors"><Pencil size={15} /></button>
          <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={15} /></button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">Manage client profiles and GPS locations</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto"><Plus size={16} /> Add Client</Button>
      </div>

      <Card className="p-0">
        <Table columns={columns} data={clients} loading={loading} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Client' : 'New Client'}>
        <div className="space-y-4">
          {[
            { label: 'Full Name',  key: 'name',      type: 'text',   placeholder: 'John Doe' },
            { label: 'Address',    key: 'address',   type: 'text',   placeholder: '123 Main St' },
            { label: 'Phone',      key: 'phone',     type: 'text',   placeholder: '+1 234 567 8900' },
            { label: 'Latitude',   key: 'latitude',  type: 'number', placeholder: '9.0192' },
            { label: 'Longitude',  key: 'longitude', type: 'number', placeholder: '38.7525' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}