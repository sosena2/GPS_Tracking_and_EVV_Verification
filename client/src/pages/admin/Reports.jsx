import { useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const StatCard = ({ label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
    <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    <p className="text-sm text-slate-500 mt-1">{label}</p>
  </div>
)

const Reports = () => {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [report, setReport]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const fetchReport = async () => {
    if (!dateFrom || !dateTo) { setError('Please select both dates'); return }
    if (dateFrom > dateTo)    { setError('Start date must be before end date'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.get(
        `/alerts/reports/daily?date_from=${dateFrom}&date_to=${dateTo}`
      )
      setReport(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    if (!report) return
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('EVV Visit Report', 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Period: ${dateFrom}  →  ${dateTo}`, 14, 30)

    // Summary
    doc.setFontSize(13)
    doc.setTextColor(0)
    doc.text('Summary', 14, 44)
    autoTable(doc, {
      startY: 48,
      head: [['Total', 'Completed', 'Missed', 'Active', 'Fraud', 'Avg Duration']],
      body: [[
        report.summary.total_visits,
        report.summary.completed_visits,
        report.summary.missed_visits,
        report.summary.active_visits,
        report.summary.fraud_visits,
        `${report.summary.avg_duration_minutes || 0} min`
      ]]
    })

    // Caregiver breakdown
    doc.text('Caregiver Breakdown', 14, doc.lastAutoTable.finalY + 12)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Caregiver', 'Completed', 'Missed', 'Flagged', 'Total']],
      body: report.caregiver_breakdown.map(c => [
        c.caregiver_name, c.completed, c.missed, c.flagged, c.total
      ])
    })

    // Daily breakdown
    doc.text('Daily Breakdown', 14, doc.lastAutoTable.finalY + 12)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Date', 'Total', 'Completed', 'Flagged']],
      body: report.daily_breakdown.map(d => [
        new Date(d.date).toLocaleDateString(),
        d.total_visits, d.completed, d.flagged
      ])
    })

    doc.save(`EVV_Report_${dateFrom}_${dateTo}.pdf`)
  }

  const exportExcel = () => {
    if (!report) return
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{
        'Total Visits':       report.summary.total_visits,
        'Completed':          report.summary.completed_visits,
        'Missed':             report.summary.missed_visits,
        'Active':             report.summary.active_visits,
        'Fraud Suspected':    report.summary.fraud_visits,
        'Avg Duration (min)': report.summary.avg_duration_minutes || 0,
      }]),
      'Summary'
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.caregiver_breakdown),
      'By Caregiver'
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(report.daily_breakdown),
      'Daily'
    )

    XLSX.writeFile(wb, `EVV_Report_${dateFrom}_${dateTo}.xlsx`)
  }

  return (
    <Layout title="Reports">

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Date Range</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Report Output */}
      {report && (
        <>
          {/* Export Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ⬇ Export PDF
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ⬇ Export Excel
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <StatCard label="Total Visits"    value={report.summary.total_visits}     color="text-slate-800" />
            <StatCard label="Completed"       value={report.summary.completed_visits} color="text-green-600" />
            <StatCard label="Missed"          value={report.summary.missed_visits}    color="text-amber-600" />
            <StatCard label="Fraud Suspected" value={report.summary.fraud_visits}     color="text-red-600"   />
            <StatCard label="Avg Duration"    value={`${report.summary.avg_duration_minutes || 0}m`} color="text-indigo-600" />
          </div>

          {/* Caregiver Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Caregiver Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Caregiver', 'Completed', 'Missed', 'Flagged', 'Total'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.caregiver_breakdown.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">{c.caregiver_name}</td>
                    <td className="px-5 py-4 text-green-600 font-semibold">{c.completed}</td>
                    <td className="px-5 py-4 text-amber-600 font-semibold">{c.missed}</td>
                    <td className="px-5 py-4 text-red-600 font-semibold">{c.flagged}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Daily Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Daily Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Date', 'Total Visits', 'Completed', 'Flagged'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.daily_breakdown.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {new Date(d.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{d.total_visits}</td>
                    <td className="px-5 py-4 text-green-600 font-semibold">{d.completed}</td>
                    <td className="px-5 py-4 text-red-600 font-semibold">{d.flagged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty state before generating */}
      {!report && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-24">
          <span className="text-4xl mb-3">📄</span>
          <p className="text-slate-500 font-medium">No report generated yet</p>
          <p className="text-slate-400 text-sm mt-1">Select a date range and click Generate Report</p>
        </div>
      )}
    </Layout>
  )
}

export default Reports