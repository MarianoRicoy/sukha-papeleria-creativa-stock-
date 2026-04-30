import { useEffect, useMemo, useRef, useState } from 'react'

import { apiJson, apiJsonCached } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'
import ProductoAutocomplete from '../components/ProductoAutocomplete.jsx'

const CODIGO_PERSONALIZADO = '999'

function formatMoneyAr(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function Ventas() {
  const [codigo, setCodigo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [producto, setProducto] = useState(null)
  const [loadingProducto, setLoadingProducto] = useState(false)
  const [loadingVenta, setLoadingVenta] = useState(false)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState('')
  const [success, setSuccess] = useState('')
  const [descripcionCustom, setDescripcionCustom] = useState('')
  const [precioCustom, setPrecioCustom] = useState('')

  const codigoRef = useRef(null)
  const busquedaRef = useRef(null)
  const cantidadRef = useRef(null)
  const descCustomRef = useRef(null)

  const esPersonalizado = producto?.codigo === CODIGO_PERSONALIZADO
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

  async function buscarProducto(explicitCodigo, options = {}) {
    const c = (explicitCodigo ?? codigoTrim).trim()
    const focusCantidad = options?.focusCantidad !== false
    setError('')
    setErrorKind('')
    setSuccess('')
    setProducto(null)

    if (!c) {
      setError('Ingresá un código')
      return
    }

    setLoadingProducto(true)
    try {
      const path = `/api/productos/${encodeURIComponent(c)}`
      const data = await apiJsonCached(path, {}, { ttlMs: 2000, key: `ventas_codigo:${c}` })
      setProducto({ codigo: c, ...data })
      setCantidad(1)
      if (c === CODIGO_PERSONALIZADO) {
        setDescripcionCustom('')
        setPrecioCustom('')
      }

      if (focusCantidad) {
        requestAnimationFrame(() => {
          if (c === CODIGO_PERSONALIZADO) {
            descCustomRef.current?.focus()
          } else {
            cantidadRef.current?.focus()
            cantidadRef.current?.select?.()
          }
        })
      }
    } catch (e) {
      if (e?.status === 404) {
        setError('Producto no encontrado')
        setErrorKind('not_found')
      } else {
        setError(e.message || 'No se pudo buscar el producto')
        setErrorKind('error')
      }
    } finally {
      setLoadingProducto(false)
    }
  }

  useEffect(() => {
    const c = codigoTrim

    if (!c) return
    if (!/^\d+$/.test(c)) return

    const id = setTimeout(() => {
      buscarProducto(c)
    }, 300)

    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoTrim])

  async function seleccionarSugerencia(item) {
    const c = String(item?.codigo || '').trim()
    if (!c) return
    setCodigo(c)
    setBusqueda('')
    await buscarProducto(c, { focusCantidad: true })
  }

  async function registrarVenta() {
    setError('')
    setErrorKind('')
    setSuccess('')

    if (!producto?.codigo) {
      setError('Primero buscá un producto por código')
      return
    }

    const cant = Number(cantidad)
    if (!Number.isFinite(cant) || cant <= 0) {
      setError('Cantidad inválida')
      setErrorKind('warning')
      return
    }

    if (esPersonalizado) {
      if (!descripcionCustom.trim()) {
        setError('Ingresá una descripción para el trabajo personalizado')
        setErrorKind('warning')
        return
      }
      const pc = Number(precioCustom)
      if (!Number.isFinite(pc) || pc <= 0) {
        setError('Ingresá un precio válido para el trabajo personalizado')
        setErrorKind('warning')
        return
      }
    }

    if (!esPersonalizado && producto?.stock_actual != null && Number(producto.stock_actual) < cant) {
      setError(`Stock insuficiente. Disponible: ${producto.stock_actual}`)
      setErrorKind('warning')
      return
    }

    setLoadingVenta(true)
    try {
      const item = { codigo_producto: producto.codigo, cantidad: cant }
      if (esPersonalizado) {
        item.descripcion_custom = descripcionCustom.trim()
        item.precio_historico = Number(precioCustom)
        item.costo_historico = 0
      }

      const data = await apiJson(`/api/ventas`, {
        method: 'POST',
        body: { items: [item] },
      })

      setSuccess(
        `Venta #${data?.venta?.id_venta ?? ''} registrada. Total: ${formatMoneyAr(
          data?.venta?.total_facturado
        )}`
      )

      setDescripcionCustom('')
      setPrecioCustom('')
      await buscarProducto(producto.codigo, { focusCantidad: false })
      codigoRef.current?.focus()
      codigoRef.current?.select?.()
    } catch (e) {
      setError(e.message || 'No se pudo registrar la venta')
      setErrorKind('error')
    } finally {
      setLoadingVenta(false)
    }
  }

  return (
    <PageShell
      title="Ventas"
      subtitle="Carga rápida: escribí un código y registrá la venta."
      maxWidthClassName="max-w-3xl"
    >
      <GlassCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-3">
              <label className="block text-sm font-medium text-sukha-ink/80">
                Buscar (código o nombre)
              </label>
              <div className="mt-1">
                <ProductoAutocomplete
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onSelect={(it) => seleccionarSugerencia(it)}
                  onEnter={async (q) => {
                    setCodigo(q)
                    setBusqueda('')
                    await buscarProducto(q, { focusCantidad: true })
                  }}
                  placeholder='Ej: "01" o "coca"'
                  inputClassName="w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
                  inputRef={busquedaRef}
                  limit={8}
                />
              </div>
            </div>

            <label className="block text-sm font-medium text-sukha-ink/80">Código</label>
            <input
              ref={codigoRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (loadingProducto) return

                  if (producto?.codigo && producto.codigo === codigoTrim) {
                    cantidadRef.current?.focus()
                    cantidadRef.current?.select?.()
                    return
                  }

                  buscarProducto(undefined, { focusCantidad: true })
                }
              }}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              placeholder='Ej: "01"'
              inputMode="numeric"
              autoFocus
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => buscarProducto()} disabled={loadingProducto} className="w-full sm:w-auto">
                {loadingProducto ? 'Buscando…' : 'Buscar'}
              </Button>
              <Button
                type="button"
                variant="glass"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCodigo('')
                  setBusqueda('')
                  setProducto(null)
                  setError('')
                  setSuccess('')
                  setDescripcionCustom('')
                  setPrecioCustom('')
                  codigoRef.current?.focus()
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Cantidad</label>
            <input
              ref={cantidadRef}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onWheel={preventWheelNumberChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') registrarVenta()
              }}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              min="1"
              step="1"
            />
            <Button
              type="button"
              variant="primary"
              className="mt-3 w-full font-semibold"
              onClick={registrarVenta}
              disabled={loadingVenta || !producto}
            >
              {loadingVenta ? 'Registrando…' : 'Registrar venta'}
            </Button>
          </div>
        </div>

        {(error || success) && (
          <div className="mt-4">
            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className={`rounded-lg px-3 py-2 text-sm ${
                  errorKind === 'not_found'
                    ? 'border border-sukha-peach/50 bg-sukha-cream/60 text-sukha-ink/80'
                    : errorKind === 'warning'
                      ? 'border border-sukha-peach/60 bg-white/50 text-sukha-ink/80'
                    : 'border border-red-200 bg-red-50/70 text-red-700'
                }`}
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
                  <div className="flex items-start gap-3">
                    {producto.imagen_url ? (
                      <img
                        src={producto.imagen_url}
                        alt={producto.descripcion || producto.codigo}
                        className="h-12 w-12 rounded-xl border border-sukha-peach/50 bg-white/40 object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div>
                      <div className="font-semibold">
                        {producto.codigo} - {producto.descripcion || '(sin descripción)'}
                      </div>
                      {!esPersonalizado && (
                        <div className="text-sukha-ink/70">Precio: {formatMoneyAr(producto.precio_venta)}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sukha-ink/70">Buscá un producto para ver los datos.</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Stock</div>
              <div className="mt-1 text-sm text-sukha-ink">
                {producto
                  ? esPersonalizado
                    ? <div className="text-sukha-ink/50 italic">N/A</div>
                    : <div className="font-semibold">{producto.stock_actual ?? '—'}</div>
                  : <div className="text-sukha-ink/70">—</div>}
              </div>
            </div>
          </div>

          {esPersonalizado && (
            <div className="mt-4 rounded-lg border border-sukha-primary/30 bg-sukha-primary/10 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sukha-ink/70">
                Datos del trabajo personalizado
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-sukha-ink/80">Descripción</label>
                  <input
                    ref={descCustomRef}
                    value={descripcionCustom}
                    onChange={(e) => setDescripcionCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        cantidadRef.current?.focus()
                        cantidadRef.current?.select?.()
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-sukha-primary/40 bg-white/70 px-3 py-2 outline-none focus:border-sukha-primary"
                    placeholder='Ej: "Libros Principito"'
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sukha-ink/80">Precio cobrado ($)</label>
                  <input
                    value={precioCustom}
                    onChange={(e) => setPrecioCustom(e.target.value)}
                    onWheel={preventWheelNumberChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        cantidadRef.current?.focus()
                        cantidadRef.current?.select?.()
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-sukha-primary/40 bg-white/70 px-3 py-2 outline-none focus:border-sukha-primary"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ej: 5000"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-sukha-ink/60">PIN activo</div>
      </GlassCard>
    </PageShell>
  )
}
