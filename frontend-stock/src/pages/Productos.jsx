import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { apiFetch, apiJson } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'
import { Table, TableShell, TBody, TD, TH, THead, TR } from '../components/ui/TableShell.jsx'
import ProductoAutocomplete from '../components/ProductoAutocomplete.jsx'

function formatMoneyAr(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function Productos() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingCodigo, setDeletingCodigo] = useState('')
  const [confirmingCodigo, setConfirmingCodigo] = useState('')
  const [uploadingCodigo, setUploadingCodigo] = useState('')
  const [removingCodigo, setRemovingCodigo] = useState('')
  const [uploadPreviewByCodigo, setUploadPreviewByCodigo] = useState({})
  const [error, setError] = useState('')

  const [editingCodigo, setEditingCodigo] = useState('')
  const [editForm, setEditEditForm] = useState({ descripcion: '' })
  const [savingCodigo, setSavingCodigo] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [searchParams, setSearchParams] = useSearchParams()

  const qTrim = useMemo(() => q.trim(), [q])
  const inputRef = useRef(null)

  useEffect(() => {
    if (!successMsg) return
    const id = setTimeout(() => setSuccessMsg(''), 3000)
    return () => clearTimeout(id)
  }, [successMsg])

  async function guardarCambios(codigo) {
    const c = String(codigo || '').trim()
    if (!c) return
    setError('')
    setSavingCodigo(c)
    try {
      await apiJson(`/api/productos/${encodeURIComponent(c)}`, {
        method: 'PUT',
        body: { descripcion: editForm.descripcion },
      })
      setSuccessMsg('¡Descripción actualizada!')
      setEditingCodigo('')
      await cargar()
    } catch (e) {
      setError(e.message || 'No se pudo actualizar el producto')
    } finally {
      setSavingCodigo('')
    }
  }

  async function exportarCsv() {
    const query = qTrim
    setError('')
    setExporting(true)
    try {
      const url = new URL(`/api/productos/export.csv`, window.location.origin)
      if (query) url.searchParams.set('q', query)

      const res = await apiFetch(`${url.pathname}${url.search}`, {
        headers: { Accept: 'text/csv' },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const msg = data?.error || `HTTP ${res.status}`
        throw new Error(msg)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      const href = URL.createObjectURL(blob)
      a.href = href
      a.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch (e) {
      setError(e.message || 'No se pudo exportar el CSV')
    } finally {
      setExporting(false)
    }
  }

  async function subirImagen(codigo, file) {
    const c = String(codigo || '').trim()
    if (!c || !file) return
    setError('')
    setUploadingCodigo(c)
    try {
      const previewUrl = URL.createObjectURL(file)
      setUploadPreviewByCodigo((prev) => {
        if (prev[c]) URL.revokeObjectURL(prev[c])
        return { ...prev, [c]: previewUrl }
      })

      const buf = await file.arrayBuffer()
      await apiJson(`/api/productos/${encodeURIComponent(c)}/imagen`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: buf,
      })
      await cargar()
    } catch (e) {
      setError(e.message || 'No se pudo subir la imagen')
    } finally {
      setUploadingCodigo('')
      setUploadPreviewByCodigo((prev) => {
        const next = { ...prev }
        if (next[c]) URL.revokeObjectURL(next[c])
        delete next[c]
        return next
      })
    }
  }

  async function quitarImagen(codigo) {
    const c = String(codigo || '').trim()
    if (!c) return
    setError('')
    setRemovingCodigo(c)
    try {
      const res = await apiFetch(`/api/productos/${encodeURIComponent(c)}/imagen`, { method: 'DELETE' })
      if (res.status !== 204) {
        const data = await res.json().catch(() => null)
        const msg = data?.error || `HTTP ${res.status}`
        throw new Error(msg)
      }
      await cargar()
    } catch (e) {
      setError(e.message || 'No se pudo quitar la imagen')
    } finally {
      setRemovingCodigo('')
    }
  }

  async function cargar(explicitQ) {
    const query = (explicitQ ?? qTrim).trim()
    setError('')
    setLoading(true)
    try {
      const url = new URL(`/api/productos`, window.location.origin)
      if (query) url.searchParams.set('q', query)
      url.searchParams.set('limit', '100')

      const data = await apiJson(`${url.pathname}${url.search}`)
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setError(e.message || 'No se pudo cargar el listado')
    } finally {
      setLoading(false)
    }
  }

  async function borrarProducto(codigo) {
    setError('')
    setDeletingCodigo(codigo)
    try {
      const res = await apiFetch(`/api/productos/${encodeURIComponent(codigo)}`, {
        method: 'DELETE',
      })

      if (res.status === 204) {
        setConfirmingCodigo('')
        await cargar()
        return
      }

      const data = await res.json().catch(() => null)
      const msg = data?.error || `HTTP ${res.status}`
      throw Object.assign(new Error(msg), { status: res.status, payload: data })
    } catch (e) {
      setConfirmingCodigo('')
      setError(e.message || 'No se pudo borrar el producto')
    } finally {
      setDeletingCodigo('')
    }
  }

  useEffect(() => {
    const initialQ = (searchParams.get('q') || '').trim()
    if (initialQ) {
      setQ(initialQ)
      cargar(initialQ)
    } else {
      cargar('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const urlQ = (searchParams.get('q') || '').trim()
    if (urlQ && urlQ !== qTrim) {
      setQ(urlQ)
      cargar(urlQ)
    }
    if (!urlQ && qTrim) {
      setQ('')
      cargar('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <PageShell
      title="Productos"
      subtitle="Listado y búsqueda."
      maxWidthClassName="max-w-7xl"
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={exportarCsv}
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-xl border border-sukha-peach/60 bg-white/60 px-4 py-2 text-sm font-semibold text-sukha-ink shadow-sm transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm disabled:opacity-60"
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <Link
            to="/productos/nuevo"
            className="inline-flex items-center justify-center rounded-xl bg-sukha-primary px-4 py-2 text-sm font-semibold text-sukha-ink shadow-sm transition hover:brightness-95 hover:shadow-sm"
          >
            Nuevo producto
          </Link>
        </div>
      }
    >
      <GlassCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl">
            <div className="w-full">
              <ProductoAutocomplete
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onSelect={(it) => {
                  const nextQ = String(it?.codigo || '').trim()
                  setQ(nextQ)
                  if (nextQ) setSearchParams({ q: nextQ })
                  else setSearchParams({})
                  cargar(nextQ)
                }}
                onEnter={(nextQ) => {
                  const trimmed = String(nextQ || '').trim()
                  setQ(trimmed)
                  if (trimmed) setSearchParams({ q: trimmed })
                  else setSearchParams({})
                  cargar(trimmed)
                }}
                placeholder="Buscar por código o descripción..."
                inputClassName="w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 text-sm outline-none focus:border-sukha-peach"
                inputRef={inputRef}
                limit={8}
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                if (qTrim) setSearchParams({ q: qTrim })
                else setSearchParams({})
                cargar()
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Buscando…' : 'Buscar'}
            </Button>
            <Button
              type="button"
              variant="glass"
              className="w-full sm:w-auto"
              onClick={() => {
                setQ('')
                setSearchParams({})
                cargar('')
                inputRef.current?.focus()
              }}
            >
              Limpiar
            </Button>
          </div>

        </div>

        {error ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {successMsg ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-lg border border-sukha-primary/30 bg-sukha-primary/10 px-3 py-2 text-sm text-sukha-ink font-medium animate-bounce"
          >
            {successMsg}
          </div>
        ) : null}

        <TableShell className="mt-4">
          <Table className="min-w-0">
            <THead>
              <tr>
                <TH className="w-[72px]">Imagen</TH>
                <TH>Código</TH>
                <TH>Descripción</TH>
                <TH>Precio</TH>
                <TH>Stock</TH>
                <TH>Acciones</TH>
              </tr>
            </THead>
            <TBody>
              {items.length === 0 ? (
                <tr>
                  <TD className="py-3 text-sukha-ink/70" colSpan={6}>
                    {loading ? 'Cargando...' : 'Sin resultados'}
                  </TD>
                </tr>
              ) : (
                items.map((p) => (
                  <TR key={p.codigo}>
                    <TD>
                      <div className="flex items-center gap-2">
                        {uploadingCodigo === p.codigo && uploadPreviewByCodigo[p.codigo] ? (
                          <img
                            src={uploadPreviewByCodigo[p.codigo]}
                            alt="Subiendo..."
                            className="h-10 w-10 rounded-lg border border-sukha-peach/50 bg-white/40 object-cover opacity-80"
                          />
                        ) : p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.descripcion || p.codigo}
                            className="h-10 w-10 rounded-lg border border-sukha-peach/50 bg-white/40 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border border-sukha-peach/40 bg-white/30" />
                        )}
                      </div>
                    </TD>
                    <TD className="font-mono">{p.codigo}</TD>
                    <TD className="max-w-[220px] sm:max-w-none">
                      {editingCodigo === p.codigo ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            className="w-full rounded border border-sukha-peach/60 bg-white px-2 py-1 text-sm outline-none focus:border-sukha-primary"
                            value={editForm.descripcion}
                            onChange={(e) => setEditEditForm({ ...editForm, descripcion: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') guardarCambios(p.codigo)
                              if (e.key === 'Escape') setEditingCodigo('')
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => guardarCambios(p.codigo)}
                            disabled={savingCodigo === p.codigo}
                            className="rounded-md bg-sukha-primary p-1 text-sukha-ink hover:brightness-95 disabled:opacity-50"
                            title="Guardar"
                          >
                            {savingCodigo === p.codigo ? (
                              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-sukha-ink border-t-transparent" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-2">
                          <div className="truncate" title={p.descripcion}>
                            {p.descripcion || <span className="text-sukha-ink/60">(sin descripción)</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCodigo(p.codigo)
                              setEditEditForm({ descripcion: p.descripcion || '' })
                            }}
                            className="invisible text-sukha-ink/40 hover:text-sukha-primary group-hover:visible"
                            title="Editar descripción"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </TD>
                    <TD>{formatMoneyAr(p.precio_venta)}</TD>
                    <TD className="font-semibold">
                      <div className="flex items-center gap-2">
                        <span>{p.stock_actual}</span>
                        {p.stock_minimo != null && Number(p.stock_actual) <= Number(p.stock_minimo) ? (
                          <span className="rounded-full border border-sukha-peach/60 bg-white/50 px-2 py-0.5 text-[11px] font-medium text-sukha-ink/80">
                            Bajo
                          </span>
                        ) : null}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        <input
                          id={`img-${p.codigo}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (file) subirImagen(p.codigo, file)
                          }}
                        />
                        <label
                          htmlFor={`img-${p.codigo}`}
                          className={`cursor-pointer rounded-lg border border-sukha-peach/60 bg-white/50 px-2 py-1 text-[11px] font-medium text-sukha-ink/80 transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm ${
                            uploadingCodigo === p.codigo ? 'pointer-events-none opacity-60' : ''
                          }`}
                        >
                          {uploadingCodigo === p.codigo ? 'Subiendo…' : p.imagen_url ? 'Imagen' : '+ Imagen'}
                        </label>
                        {p.imagen_url ? (
                          <button
                            type="button"
                            onClick={() => quitarImagen(p.codigo)}
                            disabled={removingCodigo === p.codigo}
                            className="rounded-lg border border-sukha-peach/60 bg-white/50 px-2 py-1 text-[11px] font-medium text-sukha-ink/80 transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm disabled:opacity-60"
                          >
                            {removingCodigo === p.codigo ? 'Quitando…' : 'Quitar'}
                          </button>
                        ) : null}
                        <Link
                          to={`/stock/ajustar?codigo=${encodeURIComponent(p.codigo)}`}
                          className="rounded-lg border border-sukha-peach/60 bg-white/50 px-2 py-1 text-[11px] font-medium text-sukha-ink/80 transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm"
                        >
                          Ajustar
                        </Link>
                        <Link
                          to={`/productos/${encodeURIComponent(p.codigo)}/movimientos`}
                          className="rounded-lg border border-sukha-peach/60 bg-white/50 px-2 py-1 text-[11px] font-medium text-sukha-ink/80 transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm"
                        >
                          Mov.
                        </Link>
                        <Link
                          to={`/ventas`}
                          className="rounded-lg border border-sukha-peach/60 bg-white/50 px-2 py-1 text-[11px] font-medium text-sukha-ink/80 transition hover:bg-white/70 hover:brightness-95 hover:shadow-sm"
                        >
                          Vender
                        </Link>
                        <Button
                          type="button"
                          variant={confirmingCodigo === p.codigo ? 'danger' : 'glass'}
                          className={`px-2 py-1 text-[11px] font-medium ${
                            confirmingCodigo === p.codigo ? '' : 'text-red-700'
                          }`}
                          onClick={() => {
                            if (confirmingCodigo === p.codigo) {
                              borrarProducto(p.codigo)
                            } else {
                              setConfirmingCodigo(p.codigo)
                            }
                          }}
                          disabled={deletingCodigo === p.codigo}
                        >
                          {deletingCodigo === p.codigo
                            ? 'Borrando…'
                            : confirmingCodigo === p.codigo
                              ? 'Confirmar'
                              : 'Borrar'}
                        </Button>

                        {confirmingCodigo === p.codigo ? (
                          <Button
                            type="button"
                            variant="glass"
                            className="px-2 py-1 text-[11px] font-medium"
                            onClick={() => setConfirmingCodigo('')}
                            disabled={deletingCodigo === p.codigo}
                          >
                            Cancelar
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </TableShell>
      </GlassCard>
    </PageShell>
  )
}
