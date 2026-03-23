import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { clearStoredPin } from '../lib/api.js'
import sukhaLogo from '../assets/logo sukha nombe.png'
import fondoHome1 from '../assets/fondoHome1.png'

function NavItem({ to, children, end = true }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-sukha-primary text-sukha-ink'
            : 'text-sukha-ink/80 hover:bg-sukha-light/70 hover:brightness-95 hover:shadow-sm'
        }`
      }
      end={end}
    >
      {children}
    </NavLink>
  )
}

function MenuItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block w-full rounded-md px-3 py-2 text-left text-sm transition ${
          isActive
            ? 'bg-sukha-primary text-sukha-ink'
            : 'text-sukha-ink/80 hover:bg-sukha-primary/30 hover:text-sukha-ink hover:ring-1 hover:ring-sukha-primary/40 focus-visible:bg-sukha-primary/30 focus-visible:text-sukha-ink focus-visible:ring-1 focus-visible:ring-sukha-primary/40'
        }`
      }
      end
    >
      {children}
    </NavLink>
  )
}

export default function Navbar() {
  const location = useLocation()
  const pathname = location.pathname

  const showHomeLink = pathname !== '/'
  const configActive = useMemo(() => {
    return (
      pathname === '/configuracion' ||
      pathname === '/stock/ingreso' ||
      pathname === '/stock/ajustar' ||
      pathname === '/reportes'
    )
  }, [pathname])

  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    setOpen(false)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    function onDocPointerDown(e) {
      const el = dropdownRef.current
      if (!el) return
      if (!el.contains(e.target)) setOpen(false)
    }

    function onDocKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onDocPointerDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      document.removeEventListener('pointerdown', onDocPointerDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [])

  return (
    <header
      className="sticky top-0 z-10 relative border-b border-sukha-peach/40 backdrop-blur"
      style={{
        backgroundImage: `url(${fondoHome1})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-sukha-cream/50" />

      <div className="relative mx-auto flex w-full items-center justify-between px-3 py-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center" aria-label="Ir al inicio">
            <img
              src={sukhaLogo}
              alt="Sukha"
              className="h-6 w-auto opacity-85"
              draggable={false}
            />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-sukha-peach/60 bg-white/50 px-3 py-2 text-sm font-medium text-sukha-ink/80 transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm sm:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            Menú
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            {showHomeLink ? <NavItem to="/">Inicio</NavItem> : null}
            <NavItem to="/ventas">Ventas</NavItem>
            <NavItem to="/productos">Productos</NavItem>

            <div
              className="relative"
              ref={dropdownRef}
              onMouseEnter={() => {
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
                setOpen(true)
              }}
              onMouseLeave={() => {
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
                closeTimerRef.current = setTimeout(() => setOpen(false), 180)
              }}
            >
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                onFocus={() => setOpen(true)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  configActive
                    ? 'bg-sukha-primary text-sukha-ink'
                    : 'text-sukha-ink/80 hover:bg-sukha-light/70 hover:brightness-95 hover:shadow-sm'
                }`}
              >
                Configuración
              </button>

              {open ? (
                <div className="absolute right-0 top-full w-56 pt-2">
                  <div className="rounded-xl border border-sukha-peach/50 bg-white/70 p-2 shadow backdrop-blur-md">
                    <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">
                      Configuración
                    </div>
                    <MenuItem to="/stock/ingreso">Ingreso stock</MenuItem>
                    <MenuItem to="/stock/ajustar">Ajustar stock</MenuItem>
                    <MenuItem to="/reportes">Reportes</MenuItem>
                    <div className="my-2 border-t border-sukha-peach/40" />
                    <MenuItem to="/configuracion">Cambiar PIN</MenuItem>
                  </div>
                </div>
              ) : null}
            </div>
          </nav>
          <button
            type="button"
            onClick={() => {
              clearStoredPin()
              window.location.assign('/login')
            }}
            className="hidden rounded-lg border border-sukha-peach/60 bg-white px-3 py-2 text-sm font-medium text-sukha-ink/80 transition hover:bg-sukha-light/60 hover:brightness-95 hover:shadow-sm sm:inline-flex"
          >
            Salir
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-nav" className="relative sm:hidden">
          <div className="relative mx-auto w-full px-3 pb-4 sm:px-4 lg:px-6">
            <div className="rounded-2xl border border-sukha-peach/50 bg-white/70 p-2 shadow backdrop-blur-md">
              <div className="flex flex-col gap-1">
                {showHomeLink ? <NavItem to="/">Inicio</NavItem> : null}
                <NavItem to="/ventas">Ventas</NavItem>
                <NavItem to="/productos">Productos</NavItem>

                <div className="mt-1 rounded-xl border border-sukha-peach/40 bg-white/50 p-1">
                  <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">
                    Configuración
                  </div>
                  <MenuItem to="/stock/ingreso">Ingreso stock</MenuItem>
                  <MenuItem to="/stock/ajustar">Ajustar stock</MenuItem>
                  <MenuItem to="/reportes">Reportes</MenuItem>
                  <div className="my-1 border-t border-sukha-peach/40" />
                  <MenuItem to="/configuracion">Cambiar PIN</MenuItem>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearStoredPin()
                    window.location.assign('/login')
                  }}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-sukha-peach/60 bg-white px-3 py-2 text-sm font-medium text-sukha-ink/80 transition hover:bg-sukha-light/60 hover:brightness-95 hover:shadow-sm"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
