import { Navigate, useLocation } from 'react-router-dom'
import { getStoredPin } from '../lib/api.js'

export default function RequireAuth({ children }) {
  const location = useLocation()
  const pin = getStoredPin()

  if (!pin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
