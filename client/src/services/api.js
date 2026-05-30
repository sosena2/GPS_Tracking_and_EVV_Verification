import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const baseURL = rawBaseUrl.replace(/\/$/, '')

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Auth-Token'] = token
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const requestUrl = err.config?.url || ''
    const requestToken = err.config?.headers?.['X-Auth-Token']
    const currentToken = localStorage.getItem('token')

    if (requestUrl.includes('/auth/login')) {
      return Promise.reject(err)
    }

    if (err.response?.status === 401) {
      if (requestToken && currentToken && requestToken !== currentToken) {
        return Promise.reject(err)
      }
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const login              = (data)         => api.post('/auth/login', data)
export const getClients         = ()             => api.get('/clients')
export const getClient          = (id)           => api.get(`/clients/${id}`)
export const createClient       = (data)         => api.post('/clients', data)
export const updateClient       = (id, data)     => api.put(`/clients/${id}`, data)
export const deleteClient       = (id)           => api.delete(`/clients/${id}`)
export const getAdminSchedules  = ()             => api.get('/schedules/admin')
export const getCaregiverSchedules = (id)        => api.get(`/schedules/caregiver/${id}`)
export const createSchedule     = (data)         => api.post('/schedules', data)
export const deleteSchedule     = (id)           => api.delete(`/schedules/${id}`)
export const getVisit           = (id)           => api.get(`/visits/${id}`)
export const getAllVisits       = ()             => api.get('/visits/all')
export const checkIn            = (id, coords)   => api.post(`/visits/${id}/checkin`, coords)
export const checkOut           = (id, coords)   => api.post(`/visits/${id}/checkout`, coords)
export const getActiveVisits    = ()             => api.get('/visits/active')
export const getAlerts          = ()             => api.get('/alerts')
export const resolveAlert       = (id)           => api.patch(`/alerts/${id}/resolve`)
export const getVisitReport     = (params)       => api.get('/reports/visits', { params })
export const getFraudReport     = (params)       => api.get('/reports/fraud', { params })
export const getAttendanceReport= (params)       => api.get('/reports/attendance', { params })
export const getCaregivers      = ()             => api.get('/users/caregivers')
export const updateCaregiver    = (id, data)     => api.put(`/users/caregivers/${id}`, data)
export const deleteCaregiver    = (id)           => api.delete(`/users/caregivers/${id}`)

export default api