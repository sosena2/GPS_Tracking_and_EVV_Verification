import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Users, CalendarCheck, AlertTriangle, CheckCircle } from 'lucide-react'
import { getAllVisits, getActiveVisits, getAlerts } from '../../services/api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? 0}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [allVisits, setAllVisits] = useState([])
  const [activeVisits, setActiveVisits] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const toIsoDate = (value) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  }

  const asArray = (value) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.visits)) return value.visits
    if (Array.isArray(value?.alerts)) return value.alerts
    if (Array.isArray(value?.data?.visits)) return value.data.visits
    if (Array.isArray(value?.data?.alerts)) return value.data.alerts
    return []
  }

  const fetchData = useCallback(async () => {
    try {
      const [all, active, a] = await Promise.all([getAllVisits(), getActiveVisits(), getAlerts()])
      setAllVisits(asArray(all.data))
      setActiveVisits(asArray(active.data))
      setAlerts(asArray(a.data))
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchData()
    }, 0)
    const interval = window.setInterval(() => {
      void fetchData()
    }, 30000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [fetchData])

  const activeVisitList = Array.isArray(activeVisits) ? activeVisits : []
  const allVisitList    = Array.isArray(allVisits) ? allVisits : []
  const alertList       = Array.isArray(alerts) ? alerts : []
  const activeCount     = activeVisitList.filter(v => v.status === 'active' || v.status === 'in_progress').length
  const todayString     = new Date().toISOString().split('T')[0]
  const completedCount  = allVisitList.filter((v) => {
    const completedAt = v.check_out_time || v.check_out_at || v.created_at
    const completedDate = toIsoDate(completedAt)
    return v.status === 'completed' && completedDate === todayString
  }).length
  const alertCount      = alertList.filter(a => !(a.resolved ?? a.is_resolved)).length
  const mapCenter       = activeVisitList[0]?.checkin_lat
    ? [activeVisitList[0].checkin_lat, activeVisitList[0].checkin_lng]
    : [9.0192, 38.7525]

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Live Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time monitoring of all field activities</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users}         label="Active Visits"   value={activeCount}    color="bg-blue-600" />
        <StatCard icon={CheckCircle}   label="Completed Today" value={completedCount} color="bg-emerald-600" />
        <StatCard icon={AlertTriangle} label="Open Alerts"     value={alertCount}     color="bg-red-600" />
        <StatCard icon={CalendarCheck} label="Total Visits"    value={allVisitList.length}  color="bg-primary-600" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">GPS Activity Map</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live caregiver locations</p>
        </div>
        <div style={{ height: '400px' }}>
          <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {activeVisitList.map((v, index) =>
              v.checkin_lat && (
                <Marker key={v.id || `${v.caregiver_name || 'visit'}-${index}`} position={[v.checkin_lat, v.checkin_lng]}>
                  <Popup>
                    <strong>{v.caregiver_name}</strong><br />
                    Client: {v.client_name}<br />
                    Status: {v.status}
                  </Popup>
                </Marker>
              )
            )}
          </MapContainer>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-white mb-4">Recent Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-sm">No alerts at this time.</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800">
                <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{alert.caregiver_name} · {alert.created_at}</p>
                </div>
                <Badge status={alert.type || alert.alert_type} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}