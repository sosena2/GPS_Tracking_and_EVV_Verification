import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { getVisit, checkIn, checkOut } from '../../services/api'
import { io } from 'socket.io-client'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function VisitDetail() {
  const { id }                    = useParams()
  const navigate                  = useNavigate()
  const [visit,     setVisit]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [working,   setWorking]   = useState(false)
  const [gpsStatus, setGpsStatus] = useState(null)
  const [coords,    setCoords]    = useState(null)
  const socketRef = useRef(null)
  const watchRef = useRef(null)

  const normalizeVisit = (value) => {
    if (!value) return null

    const scheduledStart = value.scheduled_start ? new Date(value.scheduled_start) : null
    const scheduledEnd = value.scheduled_end ? new Date(value.scheduled_end) : null
    const normalizedStatus = value.status === 'in_progress' ? 'active' : value.status

    return {
      ...value,
      status: normalizedStatus,
      visit_date: value.visit_date || (scheduledStart ? scheduledStart.toISOString().split('T')[0] : undefined),
      start_time: value.start_time || (scheduledStart ? scheduledStart.toTimeString().split(' ')[0].slice(0, 5) : undefined),
      end_time: value.end_time || (scheduledEnd ? scheduledEnd.toTimeString().split(' ')[0].slice(0, 5) : undefined),
      checkin_time: value.checkin_time || value.check_in_time,
      checkout_time: value.checkout_time || value.check_out_time,
      duration_mins: value.duration_mins || value.duration_minutes,
    }
  }

  const loadVisitData = async () => {
    try {
      const { data } = await getVisit(id)
      setVisit(normalizeVisit(data.visit || data))
    } catch (err) {
      console.error('Visit load error:', err)
      toast.error('Visit not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const { data } = await getVisit(id)
        if (!cancelled) setVisit(normalizeVisit(data.visit || data))
      } catch (err) {
        if (!cancelled) {
          console.error('Visit load error:', err)
          toast.error('Visit not found')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [id])

  // Real-time GPS: start socket + watch when visit becomes active
  useEffect(() => {
    // only run for active visits
    if (!visit || visit.status !== 'active') return

    const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const socketBase = rawBase.replace(/\/api\/?$/, '')
    const token = localStorage.getItem('token')

    const socket = io(socketBase, { auth: { token } })
    socketRef.current = socket

    socket.on('connect_error', (err) => {
      console.error('Socket connect error', err)
    })

    // join the visit room so server can broadcast updates
    socket.emit('join', { visitId: id })

    // start geolocation watch
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const payload = {
            visit_id: id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            device_info: navigator.userAgent
          }
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
          socket.emit('gps:update', payload)
        },
        (err) => {
          console.error('Geolocation watch error', err)
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      )
      watchRef.current = watchId
    }

    return () => {
      // cleanup
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = null
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [visit, id])

  const getGPS = () => new Promise((resolve, reject) => {
    setGpsStatus('fetching')
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
        setCoords(c)
        setGpsStatus('ready')
        resolve(c)
      },
      (err) => {
        setGpsStatus('error')
        reject(err)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })

  const handleCheckIn = async () => {
    setWorking(true)
    try {
      const c = await getGPS()
      await checkIn(id, c)
      toast.success('Checked in successfully!')
      await loadVisitData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed. GPS may be outside allowed radius.')
    } finally {
      setWorking(false)
    }
  }

  const handleCheckOut = async () => {
    setWorking(true)
    try {
      const c = await getGPS()
      await checkOut(id, c)
      toast.success('Checked out successfully!')
      await loadVisitData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  if (!visit)  return <div className="text-center text-gray-400 py-16">Visit not found.</div>

  const isPending   = !visit.status || visit.status === 'pending'
  const isActive    = visit.status === 'active'
  const isCompleted = visit.status === 'completed'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Back
        </button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-xl font-bold text-white">Visit Details</h1>
          <Badge status={visit.status || 'pending'} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <MapPin size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-white font-medium">{visit.client_name}</p>
              <p className="text-gray-400">{visit.client_address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock size={16} className="text-gray-400 shrink-0" />
            <p className="text-gray-300">{visit.visit_date} · {visit.start_time} — {visit.end_time}</p>
          </div>
          {visit.checkin_time && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <p className="text-gray-300">Checked in at {visit.checkin_time}</p>
            </div>
          )}
          {visit.checkout_time && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle size={16} className="text-blue-400 shrink-0" />
              <p className="text-gray-300">Checked out at {visit.checkout_time} · {visit.duration_mins} min</p>
            </div>
          )}
        </div>
      </Card>

      {visit.evv_status && (
        <Card>
          <h2 className="font-semibold text-white mb-3">EVV Verification</h2>
          <div className="flex items-center gap-3">
            {visit.evv_status === 'approved' && <CheckCircle size={20} className="text-emerald-400" />}
            {visit.evv_status === 'warning'  && <AlertTriangle size={20} className="text-yellow-400" />}
            {visit.evv_status === 'rejected' && <XCircle size={20} className="text-red-400" />}
            <div>
              <Badge status={visit.evv_status} />
              {visit.evv_notes && <p className="text-sm text-gray-400 mt-1">{visit.evv_notes}</p>}
            </div>
          </div>
        </Card>
      )}

      {gpsStatus && (
        <Card>
          <div className="flex items-center gap-3">
            <MapPin size={16} className={
              gpsStatus === 'ready'    ? 'text-emerald-400' :
              gpsStatus === 'error'   ? 'text-red-400' :
              'text-yellow-400'
            } />
            <p className="text-sm text-gray-300">
              {gpsStatus === 'fetching' && 'Getting your GPS location...'}
              {gpsStatus === 'ready'    && `GPS ready · Accuracy: ±${Math.round(coords?.accuracy || 0)}m`}
              {gpsStatus === 'error'    && 'Could not get GPS. Please enable location access.'}
            </p>
          </div>
        </Card>
      )}

      {!isCompleted && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {isPending && (
            <Button className="w-full flex-1 py-3 text-base" loading={working} onClick={handleCheckIn}>
              <MapPin size={18} /> Check In
            </Button>
          )}
          {isActive && (
            <Button variant="success" className="w-full flex-1 py-3 text-base" loading={working} onClick={handleCheckOut}>
              <CheckCircle size={18} /> Check Out
            </Button>
          )}
        </div>
      )}

      {isCompleted && (
        <Card className="text-center py-8">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Visit Completed</p>
          <p className="text-gray-400 text-sm mt-1">This visit has been successfully verified.</p>
        </Card>
      )}
    </div>
  )
}