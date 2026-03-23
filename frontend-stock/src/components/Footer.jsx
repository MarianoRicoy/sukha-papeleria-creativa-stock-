import { Link, useLocation } from 'react-router-dom'
import sukhaLogo from '../assets/logo sukha nombe.png'

export default function Footer() {
  const location = useLocation()
  if (location.pathname === '/login') return null

  return (
    <footer id="app-footer" className="mt-10 border-t border-sukha-peach/60 bg-sukha-cream/80 backdrop-blur">
      <div className="mx-auto flex w-full flex-col gap-4 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center" aria-label="Ir al inicio">
            <img src={sukhaLogo} alt="Sukha" className="h-5 w-auto opacity-90" draggable={false} />
          </Link>
        </div>
      </div>

      <div className="border-t border-sukha-peach/40">
        <div className="mx-auto flex w-full flex-col gap-2 px-3 py-4 text-xs text-sukha-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6">
          <div>Si no podés ingresar, verificá el PIN o pedí asistencia.</div>
          <div>{new Date().getFullYear()} · Suꓘha</div>
        </div>
      </div>
    </footer>
  )
}
