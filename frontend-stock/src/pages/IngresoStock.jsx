import { useEffect, useMemo, useRef, useState } from 'react'

import { apiJson } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'
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

export default function IngresoStock() {
  const [codigo, setCodigo] = useState('')
  const [producto, setProducto] = useState(null)

  const [cantidad, setCantidad] = useState('')
  const [costoUnitario, setCostoUnitario] = useState('')

  const [loadingBuscar, setLoadingBuscar] = useState(false)
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const codigoRef = useRef(null)
  const codigoTrim = useMemo(() => codigo.trim(), [codigo])

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
    const c = (explicitCodigo ?? codigoTrim).trim()
    setError('')
    setSuccess('')
    setProducto(null)

    if (!c) {
      setError('Ingresá un código')
      return
    }

    setLoadingBuscar(true)
    try {
      const data = await apiJson(`/api/productos/${encodeURIComponent(c)}`)
      setProducto(data)
      setCantidad('')
      setCostoUnitario('')
    } catch (e) {
      setError(e.message || 'No se pudo buscar el producto')
    } finally {
      setLoadingBuscar(false)
    }
  }

  async function registrarIngreso() {
    setError('')
    setSuccess('')

    if (!producto?.codigo) {
      setError('Primero buscá un producto')
      return
    }

    const cant = Number(String(cantidad).trim())
    if (!Number.isFinite(cant) || cant <= 0) {
      setError('Cantidad inválida')
      return
    }

    const costo = String(costoUnitario).trim() ? Number(String(costoUnitario).trim()) : 0
    if (!Number.isFinite(costo) || costo < 0) {
      setError('Costo unitario inválido')
      return
    }

    setLoadingGuardar(true)
    try {
      const data = await apiJson(`/api/ingresos-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_producto: producto.codigo,
          cantidad_ingresada: Math.trunc(cant),
          costo_unitario: costo,
        }),
      })
      setProducto(data?.producto ?? null)
      setCantidad('')
      setCostoUnitario('')
      setSuccess('Ingreso registrado')
      codigoRef.current?.focus()
      codigoRef.current?.select?.()
    } catch (e) {
      setError(e.message || 'No se pudo registrar el ingreso')
    } finally {
      setLoadingGuardar(false)
    }
  }

  return (
    <PageShell
      title="Ingreso de stock"
      subtitle="Sumá unidades al stock y registrá el ingreso."
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
                placeholder='Ej: "04"'
                inputClassName="w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
                inputRef={codigoRef}
                limit={8}
                autoFocus
              />
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => buscar()} disabled={loadingBuscar} className="w-full sm:w-auto">
                {loadingBuscar ? 'Buscando…' : 'Buscar'}
              </Button>
              <Button
                type="button"
                variant="glass"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCodigo('')
                  setProducto(null)
                  setCantidad('')
                  setCostoUnitario('')
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
            <label className="block text-sm font-medium text-sukha-ink/80">Cantidad ingresada</label>
            <input
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onWheel={preventWheelNumberChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') registrarIngreso()
              }}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              min="1"
              step="1"
              disabled={!producto}
            />

            <label className="mt-3 block text-sm font-medium text-sukha-ink/80">Costo unitario (opcional)</label>
            <input
              value={costoUnitario}
              onChange={(e) => setCostoUnitario(e.target.value)}
              onWheel={preventWheelNumberChange}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              min="0"
              step="1"
              disabled={!producto}
            />

            <Button
              type="button"
              variant="primary"
              className="mt-3 w-full font-semibold"
              onClick={registrarIngreso}
              disabled={loadingGuardar || !producto}
            >
              {loadingGuardar ? 'Registrando…' : 'Registrar ingreso'}
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
                    <div className="text-sukha-ink/70">Precio: {formatMoneyAr(producto.precio_venta)}</div>
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
