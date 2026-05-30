import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/caregivers', label: 'Caregivers', icon: '🧑‍⚕️' },
  { to: '/admin/schedules', label: 'Schedules', icon: '📅' },
  { to: '/admin/alerts', label: 'Alerts', icon: '🚨' },
  { to: '/admin/reports', label: 'Reports', icon: '📄' },
]

const caregiverLinks = [
  { to: '/caregiver', label: 'My Visits', icon: '📋', end: true },
]

const Sidebar = () => {
  const { user, logout } = useAuth()
  const links = user?.role === 'admin' ? adminLinks : caregiverLinks

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col fixed left-0 top-0">

      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm">
            📍
          </div>
          <span className="text-white font-bold text-base">EVV System</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-slate-700">
        <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
        <span className="inline-block mt-1 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full capitalize">
          {user?.role}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar