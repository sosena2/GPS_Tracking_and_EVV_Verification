import { useState } from 'react'
import { Download } from 'lucide-react'
import { getVisitReport, getFraudReport, getAttendanceReport } from '../../services/api'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const reportTypes = [
  { key: 'visits',     label: 'Visit Report'      },
  { key: 'fraud',      label: 'Fraud Report'      },
  { key: 'attendance', label: 'Attendance Report'  },
]

const apiMap = {
  visits:     getVisitReport,
  fraud:      getFraudReport,
  attendance: getAttendanceReport,
}

const columnMap = {
  visits: [
    { key: 'caregiver_name', label: 'Caregiver' },
    { key: 'client_name',    label: 'Client' },
    { key: 'visit_date',     label: 'Date' },
    { key: 'checkin_time',   label: 'Check In' },
    { key: 'checkout_time',  label: 'Check Out' },
    { key: 'duration_mins',  label: 'Duration (min)' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ],
  fraud: [
    { key: 'caregiver_name', label: 'Caregiver' },
    { key: 'alert_type',     label: 'Type', render: (r) => <Badge status={r.alert_type} /> },
    { key: 'message',        label: 'Details' },
    { key: 'created_at',     label: 'Date' },
  ],
  attendance: [
    { key: 'caregiver_name',  label: 'Caregiver' },
    { key: 'total_visits',    label: 'Total Visits' },
    { key: 'completed',       label: 'Completed' },
    { key: 'missed',          label: 'Missed' },
    { key: 'avg_duration',    label: 'Avg Duration (min)' },
  ],
}

export default function Reports() {
  const [type,      setType]      = useState('visits')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) { toast.error('Please select a date range'); return }
    setLoading(true)
    try {
      const { data: res } = await apiMap[type]({ from: dateFrom, to: dateTo })
      setData(res || [])
      setGenerated(true)
    } catch (err) {
  console.error('Report error:', err)
  toast.error('Failed to generate report')
}
    finally { setLoading(false) }
  }

  const handleExport = () => {
    if (!data.length) return
    const headers = columnMap[type].map(c => c.label).join(',')
    const rows    = data.map(row =>
      columnMap[type].map(c => `"${row[c.key] ?? ''}"`).join(',')
    ).join('\n')
    const csv  = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${type}-report-${dateFrom}-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">Generate and export compliance-ready reports</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Report Type</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setGenerated(false); setData([]) }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {reportTypes.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-end">
            <Button loading={loading} onClick={handleGenerate} className="w-full">
              Generate
            </Button>
          </div>
        </div>
      </Card>

      {generated && (
        <Card className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h2 className="font-semibold text-white capitalize">{type} Report</h2>
              <p className="text-xs text-gray-400">{dateFrom} — {dateTo} · {data.length} records</p>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download size={15} /> Export CSV
            </Button>
          </div>
          <Table columns={columnMap[type]} data={data} loading={loading} />
        </Card>
      )}
    </div>
  )
}