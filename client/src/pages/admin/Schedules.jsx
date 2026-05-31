import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getAdminSchedules, createSchedule, deleteSchedule, getClients, getCaregivers } from '../../services/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const empty = { caregiver_id: '', client_id: '', visit_date: '', start_time: '', end_time: '' }

export default function Schedules() {
  const [schedules,  setSchedules]  = useState([])
  const [clients,    setClients]    = useState([])
  const [caregivers, setCaregivers] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(empty)
  const [saving,     setSaving]     = useState(false)

  const asArray = (value, key) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.[key])) return value[key]
    if (Array.isArray(value?.data?.[key])) return value.data[key]
    return []
  }

  const load = useCallback(async () => {
    try {
      const [s, c, cg] = await Promise.all([getAdminSchedules(), getClients(), getCaregivers()])
      setSchedules(asArray(s.data, 'schedules'))
      setClients(asArray(c.data, 'clients'))
      setCaregivers(asArray(cg.data, 'caregivers'))
    } catch (err) {
      console.error('Failed to load schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load()
    }, 0)

    return () => {
      window.clearTimeout(initialLoad)
    }
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createSchedule(form)
      toast.success('Schedule created')
      setModal(false)
      setForm(empty)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await deleteSchedule(id)
      toast.success('Schedule deleted')
      load()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete')
    }
  }

  const columns = [
    { key: 'caregiver_name', label: 'Caregiver' },
    { key: 'client_name',    label: 'Client' },
    { key: 'visit_date',     label: 'Date' },
    { key: 'start_time',     label: 'Start' },
    { key: 'end_time',       label: 'End' },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status || 'pending'} /> },
    {
      key: 'actions', label: 'Actions',
      render: (row) => (
        <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:text-red-300 transition-colors">
          <Trash2 size={15} />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedules</h1>
          <p className="text-gray-400 text-sm mt-1">Assign caregivers to client visits</p>
        </div>
        <Button onClick={() => setModal(true)} className="w-full sm:w-auto"><Plus size={16} /> New Schedule</Button>
      </div>

      <Card className="p-0">
        <Table columns={columns} data={schedules} loading={loading} />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Create Schedule">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Caregiver</label>
            <select
              value={form.caregiver_id}
              onChange={(e) => setForm({ ...form, caregiver_id: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select caregiver...</option>
              {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Client</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {[
            { label: 'Visit Date', key: 'visit_date', type: 'date' },
            { label: 'Start Time', key: 'start_time', type: 'time' },
            { label: 'End Time',   key: 'end_time',   type: 'time' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>Create Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}