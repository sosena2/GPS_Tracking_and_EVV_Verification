import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wraps any page that requires login
// If not logged in → redirects to /login
// If wrong role → redirects to their correct dashboard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard
    return <Navigate to={user.role === 'admin' ? '/admin' : '/caregiver'} replace />
  }

  return children
}

export default ProtectedRoute