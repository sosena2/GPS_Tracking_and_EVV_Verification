import { Bell, Menu } from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import ThemeToggle from '../ui/ThemeToggle'

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <p className="hidden text-sm text-gray-400 sm:block">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <button type="button" className="relative hidden text-gray-400 transition-colors hover:text-white sm:inline-flex">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}