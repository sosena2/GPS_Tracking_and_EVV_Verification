import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import Spinner from '../ui/Spinner'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <Spinner size="lg" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/login" replace />

  const closeSidebar = () => setMobileSidebarOpen(false)
  const openSidebar = () => setMobileSidebarOpen(true)

  return (
    <div className="relative flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar role={user.role} mobileOpen={mobileSidebarOpen} onClose={closeSidebar} />
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={openSidebar} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}