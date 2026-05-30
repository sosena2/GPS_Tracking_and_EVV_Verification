import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthProvider'
import useTheme from './hooks/useTheme'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import Clients from './pages/admin/Clients'
import Caregivers from './pages/admin/Caregivers'
import Schedules from './pages/admin/Schedules'
import Alerts from './pages/admin/Alerts'
import Reports from './pages/admin/Reports'
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard'
import VisitDetail from './pages/caregiver/VisitDetail'

export default function App() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f9fafb' : '#111827',
              border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/clients"   element={<Clients />} />
            <Route path="/admin/caregivers" element={<Caregivers />} />
            <Route path="/admin/schedules" element={<Schedules />} />
            <Route path="/admin/alerts"    element={<Alerts />} />
            <Route path="/admin/reports"   element={<Reports />} />
          </Route>

          <Route element={<ProtectedRoute role="caregiver" />}>
            <Route path="/caregiver/dashboard"  element={<CaregiverDashboard />} />
            <Route path="/caregiver/visit/:id"  element={<VisitDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}