import { Bell } from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import ThemeToggle from '../ui/ThemeToggle'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <p className="text-sm text-gray-400">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}
      </p>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}