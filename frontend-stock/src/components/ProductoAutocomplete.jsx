import { useEffect, useMemo, useRef, useState } from 'react'

import { apiJsonCached } from '../lib/api.js'

export default function ProductoAutocomplete({
  value,
  onChange,
  onSelect,
  onEnter,
  placeholder = 'Buscar por código o descripción...',
  inputClassName = '',
  limit = 8,
  autoFocus = false,
  inputRef,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const qTrim = useMemo(() => String(value || '').trim(), [value])
  const listboxId = useMemo(
    () => `producto-autocomplete-${Math.random().toString(16).slice(2)}`,
    []
  )
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

    let cancelled = false
    const t = setTimeout(async () => {
      setError('')
      setLoading(true)
      try {
        const url = new URL('/api/productos', window.location.origin)
        url.searchParams.set('q', qTrim)
        url.searchParams.set('limit', String(limit))
        const path = `${url.pathname}${url.search}`
        const data = await apiJsonCached(path, {}, { ttlMs: 1500, key: `autocomplete:${qTrim}:${limit}` })
        if (cancelled) return
        const nextItems = Array.isArray(data?.items) ? data.items : []
        setItems(nextItems)
        setOpen(true)
        setActiveIndex((prev) => {
          if (nextItems.length === 0) return -1
          if (prev < 0) return prev
          return Math.min(prev, nextItems.length - 1)
        })
      } catch (e) {
        if (cancelled) return
        setItems([])
        setError(e.message || 'No se pudo buscar')
        setOpen(true)
        setActiveIndex(-1)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [qTrim, limit])

  useEffect(() => {
    if (!open) return
    if (activeIndex < 0) return
    const el = itemRefs.current[activeIndex]
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, open])

  function handleKeyDown(e) {
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
        e.preventDefault()
        onSelect?.(items[activeIndex])
        setOpen(false)
        setActiveIndex(-1)
        return
      }
      onEnter?.(qTrim)
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange?.(e)
          setOpen(true)
        }}
        onFocus={() => {
          if (qTrim) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0 && activeIndex < items.length
            ? `${listboxId}-opt-${activeIndex}`
            : undefined
        }
        className={inputClassName}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-sukha-peach/50 bg-white/80 shadow backdrop-blur">
          {error ? (
            <div className="px-3 py-2 text-sm text-red-700">{error}</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-sukha-ink/70">{loading ? 'Buscando…' : 'Sin resultados'}</div>
          ) : (
            <div id={listboxId} role="listbox" className="max-h-72 overflow-auto">
              {items.map((it, idx) => (
                <button
                  key={it.codigo}
                  type="button"
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  onClick={() => {
                    onSelect?.(it)
                    setOpen(false)
                    setActiveIndex(-1)
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onPointerMove={() => setActiveIndex(idx)}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition hover:bg-sukha-cream/60 focus:outline-none focus:bg-sukha-cream/60 ${
                    idx === activeIndex ? 'bg-sukha-cream/70 ring-1 ring-sukha-primary/25' : ''
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {it.imagen_url ? (
                      <img
                        src={it.imagen_url}
                        alt={it.descripcion || it.codigo}
                        className="mt-0.5 h-9 w-9 rounded-lg border border-sukha-peach/40 bg-white/40 object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-sukha-ink">{it.descripcion || '(sin descripción)'}</div>
                      <div className="mt-0.5 font-mono text-xs text-sukha-ink/70">{it.codigo}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-sukha-ink/60">Stock: {it.stock_actual ?? '—'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
