import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { getAlerts, resolveAlert } from '../../services/api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function Alerts() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)

  const asArray = (value) => {
    if (Array.isArray(value)) return value
    if (Array.isArray(value?.alerts)) return value.alerts
    if (Array.isArray(value?.data?.alerts)) return value.data.alerts
    return []
  }

  const load = useCallback(async () => {
    try {
      const { data } = await getAlerts()
      setAlerts(asArray(data))
    } catch (err) {
      console.error('Failed to load alerts:', err)
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

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id)
      toast.success('Alert resolved')
      load()
    } catch (err) {
      console.error('Resolve error:', err)
      toast.error('Failed to resolve')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  const unresolved = alerts.filter(a => !(a.resolved ?? a.is_resolved))
  const resolved   = alerts.filter(a => (a.resolved ?? a.is_resolved))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-gray-400 text-sm mt-1">{unresolved.length} open alert{unresolved.length !== 1 ? 's' : ''}</p>
      </div>

      <Card>
        <h2 className="font-semibold text-white mb-4">Open Alerts</h2>
        {unresolved.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-500">
            <CheckCircle size={32} className="mb-2 text-emerald-500" />
            <p className="text-sm">No open alerts. All clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unresolved.map((alert) => (
              <div key={alert.id} className="flex flex-col gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4 sm:flex-row sm:items-start">
                <AlertTriangle size={18} className="text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={alert.type || alert.alert_type} />
                    <span className="text-xs text-gray-400">{alert.created_at}</span>
                  </div>
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">Caregiver: {alert.caregiver_name}</p>
                </div>
                <Button variant="outline" onClick={() => handleResolve(alert.id)} className="text-xs shrink-0 sm:self-center">
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {resolved.length > 0 && (
        <Card>
          <h2 className="font-semibold text-white mb-4">Resolved Alerts</h2>
          <div className="space-y-3">
            {resolved.map((alert) => (
              <div key={alert.id} className="flex flex-col gap-4 rounded-xl bg-gray-800/50 p-4 opacity-60 sm:flex-row sm:items-start">
                <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={alert.type || alert.alert_type} />
                    <span className="text-xs text-gray-400">{alert.created_at}</span>
                  </div>
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">Caregiver: {alert.caregiver_name}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}