import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import FloatingBackButton from './components/FloatingBackButton.jsx'
import Footer from './components/Footer.jsx'
import Navbar from './components/Navbar.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import AjustarStock from './pages/AjustarStock.jsx'
import Configuracion from './pages/Configuracion.jsx'
import Home from './pages/Home.jsx'
import IngresoStock from './pages/IngresoStock.jsx'
import Login from './pages/Login.jsx'
import MovimientosProducto from './pages/MovimientosProducto.jsx'
import Productos from './pages/Productos.jsx'
import ProductoNuevo from './pages/ProductoNuevo.jsx'
import Reportes from './pages/Reportes.jsx'
import Ventas from './pages/Ventas.jsx'

export default function App() {
  const location = useLocation()
  const hideNavbar = location.pathname === '/login'

  return (
    <div className="flex min-h-screen flex-col bg-sukha-cream text-sukha-ink">
      {hideNavbar ? null : <Navbar />}
      {hideNavbar ? null : <FloatingBackButton />}
      <div className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            />
            <Route
              path="/ventas"
              element={
                <RequireAuth>
                  <Ventas />
                </RequireAuth>
              }
            />
            <Route
              path="/productos"
              element={
                <RequireAuth>
                  <Productos />
                </RequireAuth>
              }
            />
            <Route
              path="/productos/:codigo/movimientos"
              element={
                <RequireAuth>
                  <MovimientosProducto />
                </RequireAuth>
              }
            />
            <Route
              path="/productos/nuevo"
              element={
                <RequireAuth>
                  <ProductoNuevo />
                </RequireAuth>
              }
            />
            <Route
              path="/stock/ingreso"
              element={
                <RequireAuth>
                  <IngresoStock />
                </RequireAuth>
              }
            />
            <Route
              path="/stock/ajustar"
              element={
                <RequireAuth>
                  <AjustarStock />
                </RequireAuth>
              }
            />
            <Route
              path="/reportes"
              element={
                <RequireAuth>
                  <Reportes />
                </RequireAuth>
              }
            />
            <Route
              path="/configuracion"
              element={
                <RequireAuth>
                  <Configuracion />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <Footer />
    </div>
  )
}
