import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function ProtectedRoute() {
  const { user, loading, configured } = useAuth()
  const { pathname } = useLocation()
  if (!configured) return <Navigate to="/login" replace />
  if (loading) return <div className="grid min-h-screen place-items-center font-black">Loading…</div>
  // Logged-out visitors to the home address see the landing page; other pages ask them to log in.
  return user ? <Outlet /> : <Navigate to={pathname === '/' ? '/welcome' : '/login'} replace />
}