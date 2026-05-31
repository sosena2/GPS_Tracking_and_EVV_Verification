import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays,
  Bell, FileBarChart, MapPin, LogOut
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/clients',   icon: Users,           label: 'Clients'   },
  { to: '/admin/caregivers', icon: Users,          label: 'Caregivers' },
  { to: '/admin/schedules', icon: CalendarDays,    label: 'Schedules' },
  { to: '/admin/alerts',    icon: Bell,            label: 'Alerts'    },
  { to: '/admin/reports',   icon: FileBarChart,    label: 'Reports'   },
]

const caregiverLinks = [
  { to: '/caregiver/dashboard', icon: LayoutDashboard, label: 'My Visits' },
]

export default function Sidebar({ role, mobileOpen = false, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const links = role === 'admin' ? adminLinks : caregiverLinks

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleNavigate = () => {
    if (onClose) onClose()
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-gray-800 bg-gray-900 transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : ''}`}>
      <div className="border-b border-gray-800 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
            <MapPin size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">EVV System</p>
            <p className="text-xs text-gray-400 capitalize">{role} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-primary-600 text-white'
                 : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  )
}