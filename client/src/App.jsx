import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminClients from './pages/admin/Clients'
import AdminCaregivers from './pages/admin/Caregivers'
import AdminSchedules from './pages/admin/Schedules'
import AdminAlerts from './pages/admin/Alerts'
import AdminReports from './pages/admin/Reports'
import CaregiverDashboard from './pages/caregiver/Dashboard'
import VisitDetail from './pages/shared/VisitDetail'

import 'leaflet/dist/leaflet.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/clients" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminClients /></ProtectedRoute>
          } />
          <Route path="/admin/caregivers" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminCaregivers /></ProtectedRoute>
          } />
          <Route path="/admin/schedules" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminSchedules /></ProtectedRoute>
          } />
          <Route path="/admin/alerts" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminAlerts /></ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>
          } />

          <Route path="/caregiver" element={
            <ProtectedRoute allowedRoles={['caregiver']}><CaregiverDashboard /></ProtectedRoute>
          } />

          <Route path="/visits/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'caregiver']}><VisitDetail /></ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App