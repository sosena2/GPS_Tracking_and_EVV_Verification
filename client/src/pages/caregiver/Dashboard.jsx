import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const statusStyles = {
  pending:         { pill: 'bg-amber-100 text-amber-700',  label: 'Pending'     },
  in_progress:     { pill: 'bg-green-100 text-green-700',  label: 'In Progress' },
  completed:       { pill: 'bg-blue-100 text-blue-700',    label: 'Completed'   },
  missed:          { pill: 'bg-slate-100 text-slate-600',  label: 'Missed'      },
  fraud_suspected: { pill: 'bg-red-100 text-red-700',      label: 'Flagged'     },
}

const CaregiverDashboard = () => {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchSchedules() }, [])

  const fetchSchedules = async () => {
    try {
      const res = await api.get(`/schedules/caregiver/${user.user_id}`)
      setSchedules(res.data.schedules)
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const getGPS = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })

  const handleCheckIn = async (visitId) => {
    setActionLoading(visitId)
    try {
      const pos = await getGPS()
      const { latitude, longitude, accuracy } = pos.coords

      const res = await api.post('/visits/checkin', {
        visit_id: visitId,
        latitude,
        longitude,
        accuracy,
        device_info: navigator.userAgent,
      })

      showToast(`✅ ${res.data.message}`)
      fetchSchedules()
    } catch (err) {
      if (err.code === 1) {
        showToast('Location access denied. Please allow location in your browser settings.', 'error')
      } else if (err.code === 2) {
        showToast('Location unavailable. Move to an open area and try again.', 'error')
      } else {
        showToast(err.response?.data?.message || 'Check-in failed', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckOut = async (visitId) => {
    setActionLoading(visitId)
    try {
      const pos = await getGPS()
      const { latitude, longitude, accuracy } = pos.coords

      const res = await api.post('/visits/checkout', {
        visit_id: visitId,
        latitude,
        longitude,
        accuracy,
        device_info: navigator.userAgent,
        notes: '',
      })

      showToast(`🏁 ${res.data.message}`)
      fetchSchedules()
    } catch (err) {
      showToast(err.response?.data?.message || 'Check-out failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const today = new Date().toDateString()
  const todayVisits = schedules.filter(
    s => new Date(s.scheduled_start).toDateString() === today
  )
  const upcomingVisits = schedules.filter(
    s => new Date(s.scheduled_start).toDateString() !== today
  )

  return (
    <Layout title="My Visits">

      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-indigo-600 rounded-xl p-6 mb-6 text-white">
        <h2 className="text-lg font-bold">Welcome back, {user?.full_name} 👋</h2>
        <p className="text-indigo-200 text-sm mt-1">
          {todayVisits.length > 0
            ? `You have ${todayVisits.length} visit${todayVisits.length > 1 ? 's' : ''} scheduled today`
            : 'No visits scheduled for today'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          Loading your visits...
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-20">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-slate-500 font-medium">No visits scheduled</p>
          <p className="text-slate-400 text-sm mt-1">Your administrator will assign visits to you</p>
        </div>
      ) : (
        <>
          {/* Today's Visits */}
          {todayVisits.length > 0 && (
            <section className="mb-8">
              <h3 className="text-base font-semibold text-slate-700 mb-3">Today</h3>
              <div className="space-y-4">
                {todayVisits.map(s => (
                  <VisitCard
                    key={s.schedule_id}
                    schedule={s}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    actionLoading={actionLoading}
                    highlight
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcomingVisits.length > 0 && (
            <section>
              <h3 className="text-base font-semibold text-slate-700 mb-3">Upcoming</h3>
              <div className="space-y-4">
                {upcomingVisits.map(s => (
                  <VisitCard
                    key={s.schedule_id}
                    schedule={s}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Layout>
  )
}

const VisitCard = ({ schedule, onCheckIn, onCheckOut, actionLoading, highlight }) => {
  const isLoading = actionLoading === schedule.visit_id
  const status = schedule.visit_status || 'pending'
  const style = statusStyles[status] || statusStyles.pending

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${
      highlight ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-slate-800 text-base">{schedule.client_name}</h4>
          <p className="text-slate-500 text-sm mt-0.5">{schedule.client_address}</p>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${style.pill}`}>
          {style.label}
        </span>
      </div>

      {/* Schedule times */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Scheduled Start</p>
          <p className="text-sm font-medium text-slate-700">
            {new Date(schedule.scheduled_start).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Scheduled End</p>
          <p className="text-sm font-medium text-slate-700">
            {new Date(schedule.scheduled_end).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actual times if available */}
      {schedule.check_in_time && (
        <p className="text-xs text-green-600 mb-1">
          ✅ Checked in at {new Date(schedule.check_in_time).toLocaleTimeString()}
        </p>
      )}
      {schedule.check_out_time && (
        <p className="text-xs text-blue-600 mb-1">
          🏁 Checked out at {new Date(schedule.check_out_time).toLocaleTimeString()}
        </p>
      )}

      {/* Action Buttons */}
      <div className="mt-4">
        {status === 'pending' && (
          <button
            onClick={() => onCheckIn(schedule.visit_id)}
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {isLoading ? '📡 Getting your location...' : '📍 Check In'}
          </button>
        )}

        {status === 'in_progress' && (
          <button
            onClick={() => onCheckOut(schedule.visit_id)}
            disabled={isLoading}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {isLoading ? '📡 Getting your location...' : '🏁 Check Out'}
          </button>
        )}

        {(status === 'completed' || status === 'fraud_suspected') && (
          <div className="text-center text-sm text-slate-400 py-2">
            Visit completed
          </div>
        )}
      </div>
    </div>
  )
}

export default CaregiverDashboard