import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { apiJsonCached } from '../lib/api.js'

function ActionCard({ to, title, description, badge }) {
  return (
    <Link
      to={to}
      className="group relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-2xl border border-sukha-peach/50 bg-white/70 px-5 py-6 text-center shadow-[0_8px_24px_rgba(31,31,31,0.06)] transition hover:-translate-y-0.5 hover:border-sukha-peach/70 hover:shadow-[0_12px_30px_rgba(31,31,31,0.08)] focus:outline-none focus:ring-2 focus:ring-sukha-primary/40 focus:ring-offset-2 focus:ring-offset-sukha-cream before:pointer-events-none before:absolute before:inset-0 before:h-full before:w-full before:origin-top-right before:scale-[0.22] before:bg-sukha-light/70 before:content-[''] before:transition-[transform,border-radius] before:duration-500 before:ease-out before:rounded-bl-[999px] before:rounded-tr-2xl after:pointer-events-none after:absolute after:inset-0 after:h-full after:w-full after:origin-bottom-left after:scale-[0.22] after:bg-sukha-pink/40 after:content-[''] after:transition-[transform,border-radius] after:duration-500 after:ease-out after:rounded-tr-[999px] after:rounded-bl-2xl group-hover:before:scale-100 group-hover:before:rounded-2xl group-hover:after:scale-100 group-hover:after:rounded-2xl group-focus-visible:before:scale-100 group-focus-visible:before:rounded-2xl group-focus-visible:after:scale-100 group-focus-visible:after:rounded-2xl"
    >
      {badge ? (
        <div className="absolute right-3 top-3 z-10 shrink-0 rounded-full border border-sukha-peach/50 bg-white/70 px-2 py-0.5 text-xs font-medium text-sukha-ink/80 backdrop-blur">
          {badge}
        </div>
      ) : null}

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 text-center">
        <div className="text-base font-semibold tracking-wide text-sukha-ink transition-all duration-300 ease-out group-hover:text-lg group-hover:tracking-wide group-focus-visible:text-lg">
          {title}
        </div>
        <div className="mt-2 max-w-[30ch] text-sm leading-snug text-sukha-ink/80 opacity-0 transition-all duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
          {description}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-100 ring-1 ring-sukha-ink/5" />
    </Link>
  )
}

export default function Home() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const qTrim = useMemo(() => q.trim(), [q])
  const navigate = useNavigate()
  const wrapperRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => {
    function onDocPointerDown(e) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  useEffect(() => {
    if (!qTrim) {
      setItems([])
      setError('')
      setLoading(false)
      setActiveIndex(-1)
      return
    }

    const t = setTimeout(async () => {
      setError('')
      setLoading(true)
      try {
        const url = new URL('/api/productos', window.location.origin)
        url.searchParams.set('q', qTrim)
        url.searchParams.set('limit', '8')
        const path = `${url.pathname}${url.search}`
        const data = await apiJsonCached(path, {}, { ttlMs: 1500, key: `home_suggest:${qTrim}` })
        setItems(Array.isArray(data?.items) ? data.items : [])
        setOpen(true)
        setActiveIndex(-1)
      } catch (e) {
        setItems([])
        setError(e.message || 'No se pudo buscar')
        setOpen(true)
        setActiveIndex(-1)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [qTrim])

  useEffect(() => {
    if (!open) return
    if (activeIndex < 0) return
    const el = itemRefs.current[activeIndex]
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, open])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:py-10">
      <section className="relative rounded-2xl border border-sukha-peach/40 bg-sukha-cream/70 px-5 py-5 shadow-[0_10px_30px_rgba(31,31,31,0.06)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sukha-light/70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-sukha-pink/45 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1 className="text-2xl font-semibold text-sukha-ink">Inicio</h1>

          <Link
            to="/ventas"
            className="inline-flex w-full items-center justify-center rounded-xl bg-sukha-primary px-4 py-2 text-sm font-semibold text-sukha-ink shadow-sm transition hover:brightness-95 hover:shadow-sm sm:w-auto"
          >
            Cargar venta
          </Link>
        </div>

        <div ref={wrapperRef} className="relative mt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (qTrim) setOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                if (!open) setOpen(true)
                if (items.length === 0) return
                setActiveIndex((prev) => {
                  const next = prev < 0 ? 0 : Math.min(items.length - 1, prev + 1)
                  return next
                })
                return
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault()
                if (!open) setOpen(true)
                if (items.length === 0) return
                setActiveIndex((prev) => {
                  if (prev < 0) return items.length - 1
                  return Math.max(0, prev - 1)
                })
                return
              }

              if (e.key === 'Enter' && qTrim) {
                if (open && activeIndex >= 0 && activeIndex < items.length) {
                  navigate(`/productos?q=${encodeURIComponent(items[activeIndex].codigo)}`)
                  setOpen(false)
                  return
                }
                navigate(`/productos?q=${encodeURIComponent(qTrim)}`)
                setOpen(false)
                return
              }

              if (e.key === 'Escape') {
                setOpen(false)
                setActiveIndex(-1)
              }
            }}
            className="w-full rounded-xl border border-sukha-peach/50 bg-white/70 px-4 py-3 text-sm text-sukha-ink outline-none backdrop-blur focus:border-sukha-peach focus:ring-2 focus:ring-sukha-primary/30"
            placeholder="Buscar artículo por código o descripción..."
          />

          {open ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-sukha-peach/50 bg-white/80 shadow-[0_14px_34px_rgba(31,31,31,0.10)] backdrop-blur">
              {error ? (
                <div className="px-4 py-3 text-sm text-red-700">{error}</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-3 text-sm text-sukha-ink/70">
                  {loading ? 'Buscando…' : 'Sin resultados'}
                </div>
              ) : (
                <div className="max-h-72 overflow-auto">
                  {items.map((p, idx) => (
                    <button
                      key={p.codigo}
                      type="button"
                      ref={(el) => {
                        itemRefs.current = itemRefs.current || []
                        itemRefs.current[idx] = el
                      }}
                      onClick={() => {
                        navigate(`/productos?q=${encodeURIComponent(p.codigo)}`)
                        setOpen(false)
                        setActiveIndex(-1)
                      }}
                      onMouseEnter={() => {
                        setActiveIndex(idx)
                      }}
                      className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-sukha-cream/60 focus:outline-none focus:bg-sukha-cream/60 ${
                        items[activeIndex]?.codigo === p.codigo ? 'bg-sukha-cream/60' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.descripcion || p.codigo}
                            className="mt-0.5 h-10 w-10 rounded-xl border border-sukha-peach/40 bg-white/40 object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg border border-sukha-peach/50 bg-white/60 px-2 py-0.5 font-mono text-xs text-sukha-ink/80">
                              {p.codigo}
                            </span>
                            <span className="truncate text-sm font-medium text-sukha-ink">
                              {p.descripcion || '(sin descripción)'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-sukha-ink/60">Ver en Productos</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-sukha-ink/70">Stock: {p.stock_actual ?? 0}</div>
                    </button>
                  ))}
                </div>
              )}

              {qTrim ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/productos?q=${encodeURIComponent(qTrim)}`)
                    setOpen(false)
                  }}
                  className="w-full border-t border-sukha-peach/40 px-4 py-2 text-left text-xs font-medium text-sukha-ink/80 transition hover:bg-sukha-cream/60 hover:brightness-95 hover:shadow-sm"
                >
                  Ver todos los resultados para “{qTrim}”
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        <ActionCard to="/ventas" title="Ventas" description="Registrar una venta" />
        <ActionCard to="/productos" title="Productos" description="Listado, búsqueda y acciones" />
        <ActionCard to="/productos/nuevo" title="Agregar producto" description="Crear un producto nuevo" />
        <ActionCard to="/stock/ingreso" title="Ingreso stock" description="Sumar stock" />
        <ActionCard to="/stock/ajustar" title="Ajustar stock" description="Corregir stock" />
        <ActionCard to="/reportes" title="Reportes" description="Unidades y financiero" />
      </section>
    </main>
  )
}
