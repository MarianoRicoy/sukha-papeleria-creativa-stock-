import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function FloatingBackButton() {
  const location = useLocation()
  const navigate = useNavigate()
  const [footerHeight, setFooterHeight] = useState(0)

  const pathname = location.pathname
  const show = useMemo(() => {
    if (pathname === '/' || pathname === '/login') return false
    return true
  }, [pathname])

  function goBack() {
    const idx = Number(window.history?.state?.idx)
    if (Number.isFinite(idx) && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  useEffect(() => {
    const el = document.getElementById('app-footer')
    if (!el) {
      setFooterHeight(0)
      return
    }

    function update() {
      const rect = el.getBoundingClientRect()
      setFooterHeight(Math.max(0, Math.round(rect.height)))
    }

    update()

    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update())
      ro.observe(el)
    }

    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      if (ro) ro.disconnect()
    }
  }, [location.pathname])

  if (!show) return null

  const baseBottom = 20
  const bottomPx = baseBottom + (footerHeight ? footerHeight + 12 : 0)

  return (
    <button
      type="button"
      onClick={goBack}
      style={{ bottom: `calc(${bottomPx}px + env(safe-area-inset-bottom, 0px))` }}
      className="print-hide fixed right-3 z-20 inline-flex items-center justify-center rounded-full border border-sukha-peach/35 bg-white/30 px-3 py-2 text-xs font-semibold text-sukha-ink/75 shadow-[0_12px_30px_rgba(31,31,31,0.10)] backdrop-blur transition hover:border-sukha-primary/50 hover:bg-sukha-primary hover:text-sukha-ink hover:brightness-95 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sukha-primary/30 sm:right-5 sm:px-4 sm:py-3 sm:text-sm"
    >
      Volver
    </button>
  )
}
