import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, CheckCircle, MapPin } from 'lucide-react'
import { getCaregiverSchedules } from '../../services/api'
import useAuth from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

export default function CaregiverDashboard() {
  const { user } = useAuth()
  const navigate              = useNavigate()
  const [visits,  setVisits]  = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await getCaregiverSchedules(user?.id)
        const schedules = Array.isArray(data)
          ? data
          : Array.isArray(data?.schedules)
            ? data.schedules
            : Array.isArray(data?.data?.schedules)
              ? data.data.schedules
              : []

        if (!cancelled) setVisits(schedules)
      } catch (err) {
        console.error('Failed to load visits:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (user?.id) load()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  const getDisplayStatus = (visit) => {
    const status = visit.visit_status || visit.status
    return status === 'in_progress' ? 'active' : status
  }

  const today     = visits.filter(v => v.visit_date === new Date().toISOString().split('T')[0])
  const upcoming  = visits.filter(v => v.visit_date >  new Date().toISOString().split('T')[0])
  const completed = visits.filter(v => v.status === 'completed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Good day, {user.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here are your assigned visits</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: CalendarDays, label: "Today's Visits", value: today.length,     color: 'bg-blue-600' },
          { icon: Clock,        label: 'Upcoming',       value: upcoming.length,  color: 'bg-emerald-600' },
          { icon: CheckCircle,  label: 'Completed',      value: completed.length, color: 'bg-emerald-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold text-white mb-4">Today's Schedule</h2>
        {today.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No visits scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {today.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-800 border border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{visit.client_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{visit.client_address}</p>
                    <p className="text-xs text-gray-400">{visit.start_time} — {visit.end_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={getDisplayStatus(visit) || 'pending'} />
                  <Button
                    variant={getDisplayStatus(visit) === 'completed' ? 'ghost' : 'primary'}
                    disabled={getDisplayStatus(visit) === 'completed'}
                    onClick={() => navigate(`/caregiver/visit/${visit.id}`)}
                  >
                    {getDisplayStatus(visit) === 'active' ? 'Check Out' : getDisplayStatus(visit) === 'completed' ? 'Done' : 'Check In'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <h2 className="font-semibold text-white mb-4">Upcoming Visits</h2>
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((visit) => (
              <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-white">{visit.client_name}</p>
                  <p className="text-xs text-gray-400">{visit.visit_date} · {visit.start_time} — {visit.end_time}</p>
                </div>
                <Badge status="pending" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}