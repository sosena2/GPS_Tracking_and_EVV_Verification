import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import Spinner from '../ui/Spinner'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <Spinner size="lg" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar role={user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}