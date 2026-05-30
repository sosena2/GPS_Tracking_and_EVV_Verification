import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
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
  pending:         'bg-amber-100 text-amber-700',
  in_progress:     'bg-green-100 text-green-700',
  completed:       'bg-blue-100 text-blue-700',
  missed:          'bg-slate-100 text-slate-600',
  fraud_suspected: 'bg-red-100 text-red-700',
}

const VisitDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const res = await api.get(`/visits/${id}`)
        setData(res.data)
      } catch (err) {
        setError('Visit not found or you do not have access.')
      } finally {
        setLoading(false)
      }
    }
    fetchVisit()
  }, [id])

  if (loading) {
    return (
      <Layout title="Visit Detail">
        <div className="flex items-center justify-center py-16 text-slate-400">
          Loading visit...
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout title="Visit Detail">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          {error}
        </div>
      </Layout>
    )
  }

  const { visit, gps_logs, alerts } = data

  // Build map center — prefer check-in location, fall back to client
  const hasCheckin = visit.check_in_latitude && visit.check_in_longitude
  const mapCenter = hasCheckin
    ? [parseFloat(visit.check_in_latitude), parseFloat(visit.check_in_longitude)]
    : [9.0192, 38.7525]

  const duration = visit.check_in_time && visit.check_out_time
    ? Math.round(
        (new Date(visit.check_out_time) - new Date(visit.check_in_time)) / 60000
      )
    : null

  return (
    <Layout title="Visit Detail">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Back
      </button>

      {/* Top info card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{visit.client_name}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{visit.client_address}</p>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium capitalize ${
            statusStyles[visit.status] || 'bg-slate-100 text-slate-600'
          }`}>
            {visit.status?.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoBox label="Caregiver"    value={visit.caregiver_name} />
          <InfoBox label="Scheduled Start" value={new Date(visit.scheduled_start).toLocaleString()} />
          <InfoBox label="Scheduled End"   value={new Date(visit.scheduled_end).toLocaleString()} />
          <InfoBox
            label="Duration"
            value={duration !== null ? `${duration} minutes` : '—'}
          />
        </div>
      </div>

      {/* GPS Timeline + Map */}
      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* GPS Events */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">GPS Timeline</h3>

          <div className="space-y-4">
            {/* Check-in event */}
            <div className={`flex gap-3 p-3 rounded-lg ${
              hasCheckin ? 'bg-green-50' : 'bg-slate-50'
            }`}>
              <span className="text-xl">{hasCheckin ? '📍' : '⏳'}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">Check-In</p>
                {visit.check_in_time ? (
                  <>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(visit.check_in_time).toLocaleString()}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      {parseFloat(visit.check_in_latitude).toFixed(6)},&nbsp;
                      {parseFloat(visit.check_in_longitude).toFixed(6)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Not yet checked in</p>
                )}
              </div>
            </div>

            {/* Check-out event */}
            <div className={`flex gap-3 p-3 rounded-lg ${
              visit.check_out_time ? 'bg-blue-50' : 'bg-slate-50'
            }`}>
              <span className="text-xl">{visit.check_out_time ? '🏁' : '⏳'}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">Check-Out</p>
                {visit.check_out_time ? (
                  <>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(visit.check_out_time).toLocaleString()}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      {parseFloat(visit.check_out_latitude).toFixed(6)},&nbsp;
                      {parseFloat(visit.check_out_longitude).toFixed(6)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Not yet checked out</p>
                )}
              </div>
            </div>
          </div>

          {/* GPS Logs */}
          {gps_logs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                All GPS Events ({gps_logs.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {gps_logs.map(log => (
                  <div key={log.log_id} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
                    <span className="font-mono">
                      {parseFloat(log.latitude).toFixed(5)},&nbsp;
                      {parseFloat(log.longitude).toFixed(5)}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>{new Date(log.captured_at).toLocaleTimeString()}</span>
                    {log.accuracy && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>±{log.accuracy}m</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Location Map</h3>
          <div className="h-72 rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />

              {/* Check-in marker */}
              {hasCheckin && (
                <>
                  <Marker position={mapCenter}>
                    <Popup>
                      <p className="text-sm font-medium">Check-In Location</p>
                      <p className="text-xs text-slate-500">{visit.caregiver_name}</p>
                    </Popup>
                  </Marker>
                  {/* 100m geofence circle */}
                  <Circle
                    center={mapCenter}
                    radius={100}
                    pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.08 }}
                  />
                </>
              )}

              {/* Check-out marker */}
              {visit.check_out_latitude && visit.check_out_longitude && (
                <Marker
                  position={[
                    parseFloat(visit.check_out_latitude),
                    parseFloat(visit.check_out_longitude)
                  ]}
                >
                  <Popup>
                    <p className="text-sm font-medium">Check-Out Location</p>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Blue circle = 100m allowed geofence radius
          </p>
        </div>
      </div>

      {/* Alerts for this visit */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            EVV Alerts ({alerts.length})
          </h3>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.alert_id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'high'     ? 'bg-orange-50 border-orange-200' :
                  'bg-amber-50 border-amber-200'
                }`}
              >
                <span className="text-lg flex-shrink-0">
                  {alert.severity === 'critical' ? '🚨' :
                   alert.severity === 'high'     ? '⚠️' : '📌'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {alert.alert_type.replace(/_/g, ' ')}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      alert.severity === 'high'     ? 'bg-orange-200 text-orange-800' :
                      'bg-amber-200 text-amber-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">{alert.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {visit.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6">
          <h3 className="font-semibold text-slate-800 mb-2">Visit Notes</h3>
          <p className="text-sm text-slate-600">{visit.notes}</p>
        </div>
      )}
    </Layout>
  )
}

const InfoBox = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3">
    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
  </div>
)

export default VisitDetail