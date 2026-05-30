import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/axios'

const severityStyles = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const Alerts = () => {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)
  const [toast, setToast] = useState(null)
  const [filters, setFilters] = useState({ severity: '', is_resolved: 'false', alert_type: '' })

  useEffect(() => { fetchAlerts() }, [filters])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.severity)    params.append('severity', filters.severity)
      if (filters.is_resolved) params.append('is_resolved', filters.is_resolved)
      if (filters.alert_type)  params.append('alert_type', filters.alert_type)

      const res = await api.get(`/alerts?${params.toString()}`)
      setAlerts(res.data.alerts)
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleResolve = async (alertId) => {
    setResolving(alertId)
    try {
      await api.patch(`/alerts/${alertId}/resolve`)
      showToast('Alert marked as resolved')
      fetchAlerts()
    } catch (err) {
      showToast('Failed to resolve alert', 'error')
    } finally {
      setResolving(null)
    }
  }

  const unresolvedCount = alerts.filter(a => !a.is_resolved).length

  return (
    <Layout title="Alerts">

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
          <h2 className="text-xl font-bold text-slate-800">Alerts</h2>
          <p className="text-slate-500 text-sm">
            {unresolvedCount} unresolved alert{unresolvedCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={filters.is_resolved}
              onChange={e => setFilters({ ...filters, is_resolved: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={e => setFilters({ ...filters, severity: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={filters.alert_type}
              onChange={e => setFilters({ ...filters, alert_type: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              <option value="gps_spoofing">GPS Spoofing</option>
              <option value="location_mismatch">Location Mismatch</option>
              <option value="time_mismatch">Time Mismatch</option>
              <option value="suspicious_pattern">Suspicious Pattern</option>
              <option value="missing_checkout">Missing Checkout</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-20">
          <span className="text-4xl mb-3">✅</span>
          <p className="text-slate-500 font-medium">No alerts found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.alert_id}
              className={`bg-white rounded-xl shadow-sm border p-5 transition-opacity ${
                alert.is_resolved ? 'border-slate-200 opacity-60' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">

                  {/* Severity dot */}
                  <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'high'     ? 'bg-orange-500' :
                    alert.severity === 'medium'   ? 'bg-amber-400' :
                    'bg-slate-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    {/* Type + severity */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 text-sm capitalize">
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        severityStyles[alert.severity] || severityStyles.low
                      }`}>
                        {alert.severity}
                      </span>
                      {alert.is_resolved && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Resolved
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 mb-2">{alert.description}</p>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {alert.caregiver_name && (
                        <span>👤 {alert.caregiver_name}</span>
                      )}
                      {alert.client_name && (
                        <span>🏠 {alert.client_name}</span>
                      )}
                      <span>🕐 {new Date(alert.created_at).toLocaleString()}</span>
                      {alert.resolved_at && (
                        <span>✅ Resolved {new Date(alert.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resolve button */}
                {!alert.is_resolved && (
                  <button
                    onClick={() => handleResolve(alert.alert_id)}
                    disabled={resolving === alert.alert_id}
                    className="flex-shrink-0 px-4 py-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {resolving === alert.alert_id ? 'Resolving...' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Alerts