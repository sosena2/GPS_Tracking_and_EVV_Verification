import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import { login as loginApi } from '../services/api'
import toast from 'react-hot-toast'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    try {
      const { data } = await loginApi({ email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}