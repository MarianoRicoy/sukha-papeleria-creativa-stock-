import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { apiJson } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'
import ProductoAutocomplete from '../components/ProductoAutocomplete.jsx'

export default function AjustarStock() {
  const [searchParams] = useSearchParams()
  const [codigo, setCodigo] = useState('')
  const [producto, setProducto] = useState(null)
  const [nuevoStock, setNuevoStock] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')

  const [loadingBuscar, setLoadingBuscar] = useState(false)
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const codigoTrim = useMemo(() => codigo.trim(), [codigo])
  const codigoRef = useRef(null)

  useEffect(() => {
    const fromQuery = searchParams.get('codigo')
    if (fromQuery && typeof fromQuery === 'string') {
      const c = fromQuery.trim()
      if (c) setCodigo(c)
    }
  }, [searchParams])

  useEffect(() => {
    const fromQuery = searchParams.get('codigo')
    if (fromQuery && typeof fromQuery === 'string') {
      const c = fromQuery.trim()
      if (c) buscar(c)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => setSuccess(''), 2500)
      return () => clearTimeout(id)
    }
  }, [success])

  function preventWheelNumberChange(e) {
    e.currentTarget.blur()
  }

  async function buscar(explicitCodigo) {
    setError('')
    setSuccess('')
    setProducto(null)

    const c = (explicitCodigo ?? codigoTrim).trim()
    if (!c) {
      setError('Ingresá un código')
      return
    }

    setLoadingBuscar(true)
    try {
      const data = await apiJson(`/api/productos/${encodeURIComponent(c)}`)
      setProducto(data)
      setNuevoStock(String(data?.stock_actual ?? ''))
      setStockMinimo(String(data?.stock_minimo ?? ''))
    } catch (e) {
      setError(e.message || 'No se pudo buscar el producto')
    } finally {
      setLoadingBuscar(false)
    }
  }

  async function guardar() {
    setError('')
    setSuccess('')

    if (!producto?.codigo) {
      setError('Primero buscá un producto')
      return
    }

    const s = Number(String(nuevoStock).trim())
    if (!Number.isFinite(s) || s < 0) {
      setError('Stock inválido')
      return
    }

    let sminPayload = null
    const sminTrim = String(stockMinimo).trim()
    if (sminTrim) {
      const smin = Number(sminTrim)
      if (!Number.isFinite(smin) || smin < 0) {
        setError('Stock mínimo inválido')
        return
      }
      sminPayload = Math.trunc(smin)
    }

    setLoadingGuardar(true)
    try {
      const updated = await apiJson(`/api/productos/${encodeURIComponent(producto.codigo)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_actual: Math.trunc(s), stock_minimo: sminPayload }),
      })
      setProducto(updated)
      setNuevoStock(String(updated?.stock_actual ?? ''))
      setStockMinimo(String(updated?.stock_minimo ?? ''))
      setSuccess('Stock actualizado')
      codigoRef.current?.focus()
      codigoRef.current?.select?.()
    } catch (e) {
      setError(e.message || 'No se pudo actualizar el stock')
    } finally {
      setLoadingGuardar(false)
    }
  }

  return (
    <PageShell
      title="Ajustar stock"
      subtitle="Corregí el stock de un producto existente."
      maxWidthClassName="max-w-3xl"
    >
      <GlassCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-sukha-ink/80">Código</label>
            <div className="mt-1">
              <ProductoAutocomplete
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onSelect={(it) => {
                  const c = String(it?.codigo || '').trim()
                  if (!c) return
                  setCodigo(c)
                  buscar(c)
                }}
                onEnter={(q) => buscar(q)}
                placeholder='Ej: "03"'
                inputClassName="w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
                inputRef={codigoRef}
                limit={8}
                autoFocus
              />
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={buscar} disabled={loadingBuscar} className="w-full sm:w-auto">
                {loadingBuscar ? 'Buscando…' : 'Buscar'}
              </Button>
              <Button
                type="button"
                variant="glass"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCodigo('')
                  setProducto(null)
                  setNuevoStock('')
                  setStockMinimo('')
                  setError('')
                  setSuccess('')
                  codigoRef.current?.focus()
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Nuevo stock</label>
            <input
              value={nuevoStock}
              onChange={(e) => setNuevoStock(e.target.value)}
              onWheel={preventWheelNumberChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardar()
              }}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              min="0"
              step="1"
              disabled={!producto}
            />

            <label className="mt-3 block text-sm font-medium text-sukha-ink/80">Stock mínimo (alerta)</label>
            <input
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              onWheel={preventWheelNumberChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardar()
              }}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              min="0"
              step="1"
              disabled={!producto}
              placeholder="Ej: 3"
            />
            <Button
              type="button"
              variant="primary"
              className="mt-3 w-full font-semibold"
              onClick={guardar}
              disabled={loadingGuardar || !producto}
            >
              {loadingGuardar ? 'Guardando…' : 'Guardar ajuste'}
            </Button>
          </div>
        </div>

        {(error || success) && (
          <div className="mt-4">
            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
            {success ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-sukha-primary/40 bg-sukha-primary/20 px-3 py-2 text-sm text-sukha-ink"
              >
                {success}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-5 rounded-lg border border-sukha-peach/50 bg-white/50 p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Producto</div>
              <div className="mt-1 text-sm text-sukha-ink">
                {producto ? (
                  <div>
                    <div className="font-semibold">
                      {producto.codigo} - {producto.descripcion || '(sin descripción)'}
                    </div>
                    <div className="text-sukha-ink/70">Precio: {producto.precio_venta ?? '—'}</div>
                  </div>
                ) : (
                  <div className="text-sukha-ink/70">Buscá un producto para ver los datos.</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Stock actual</div>
              <div className="mt-1 text-sm text-sukha-ink">
                {producto ? <div className="font-semibold">{producto.stock_actual}</div> : <div className="text-sukha-ink/70">—</div>}
              </div>
            </div>
          </div>
        </div>

      </GlassCard>
    </PageShell>
  )
}
