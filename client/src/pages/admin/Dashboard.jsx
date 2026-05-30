import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import Layout from '../../components/Layout'
import api from '../../api/axios'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const statusStyles = {
  pending:        { pill: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  in_progress:    { pill: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  completed:      { pill: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'  },
  missed:         { pill: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
  fraud_suspected:{ pill: 'bg-red-100 text-red-700',      dot: 'bg-red-500'   },
}

const StatCard = ({ label, value, color, icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </div>
)

const Dashboard = () => {
  const [visits, setVisits] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [visitsRes, alertsRes] = await Promise.all([
        api.get('/visits/all'),
        api.get('/alerts?is_resolved=false')
      ])
      setVisits(visitsRes.data.visits)
      setAlerts(alertsRes.data.alerts)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + poll every 30 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const stats = {
    active:    visits.filter(v => v.status === 'in_progress').length,
    pending:   visits.filter(v => v.status === 'pending').length,
    completed: visits.filter(v => v.status === 'completed').length,
    flagged:   visits.filter(v => v.status === 'fraud_suspected').length,
  }

  // Visits that have GPS and are currently active — show on map
  const mappableVisits = visits.filter(
    v => v.status === 'in_progress' &&
         v.check_in_latitude &&
         v.check_in_longitude
  )

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64 text-slate-400">
          Loading dashboard...
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard">

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Visits"    value={stats.active}    icon="🟢" color="bg-green-50"  />
        <StatCard label="Pending"          value={stats.pending}   icon="🕐" color="bg-amber-50"  />
        <StatCard label="Completed Today"  value={stats.completed} icon="✅" color="bg-blue-50"   />
        <StatCard label="Flagged"          value={stats.flagged}   icon="🚨" color="bg-red-50"    />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        {/* Live Map */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Live Caregiver Locations</h3>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <div className="h-80 rounded-lg overflow-hidden">
            <MapContainer
              center={[9.0192, 38.7525]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              {mappableVisits.map(v => (
                <Marker
                  key={v.visit_id}
                  position={[
                    parseFloat(v.check_in_latitude),
                    parseFloat(v.check_in_longitude)
                  ]}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{v.caregiver_name}</p>
                      <p className="text-slate-500">Client: {v.client_name}</p>
                      <p className="text-slate-500">
                        Since: {new Date(v.check_in_time).toLocaleTimeString()}
                      </p>
                      <Link
                        to={`/visits/${v.visit_id}`}
                        className="text-indigo-600 font-medium"
                      >
                        View details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {mappableVisits.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-3">
              No active visits with GPS data right now.
            </p>
          )}
        </div>

        {/* Unresolved Alerts Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Alerts</h3>
            <Link
              to="/admin/alerts"
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              View all
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
              <span className="text-3xl mb-2">✅</span>
              No unresolved alerts
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {alerts.slice(0, 8).map(alert => (
                <div
                  key={alert.alert_id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'high'     ? 'bg-orange-500' :
                    'bg-amber-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 capitalize">
                      {alert.alert_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {alert.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Visits Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Recent Visits</h3>
          <span className="text-xs text-slate-400">Showing latest 10</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Caregiver', 'Client', 'Check In', 'Check Out', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visits.slice(0, 10).map(v => {
              const s = statusStyles[v.status] || statusStyles.pending
              return (
                <tr key={v.visit_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-800">{v.caregiver_name}</td>
                  <td className="px-5 py-4 text-slate-600">{v.client_name}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {v.check_in_time ? new Date(v.check_in_time).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {v.check_out_time ? new Date(v.check_out_time).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {v.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/visits/${v.visit_id}`}
                      className="text-indigo-600 hover:underline text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Dashboard