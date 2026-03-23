import { useEffect, useMemo, useRef, useState } from 'react'

import { apiJson } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'

export default function ProductoNuevo() {
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [costo, setCosto] = useState('')
  const [stockActual, setStockActual] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')
  const [imagenFile, setImagenFile] = useState(null)
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const codigoTrim = useMemo(() => codigo.trim(), [codigo])
  const codigoRef = useRef(null)

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => setSuccess(''), 2500)
      return () => clearTimeout(id)
    }
  }, [success])

  useEffect(() => {
    if (!imagenFile) {
      if (imagenPreviewUrl) URL.revokeObjectURL(imagenPreviewUrl)
      setImagenPreviewUrl('')
      return
    }

    if (imagenPreviewUrl) URL.revokeObjectURL(imagenPreviewUrl)
    const next = URL.createObjectURL(imagenFile)
    setImagenPreviewUrl(next)
    return () => {
      URL.revokeObjectURL(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenFile])

  function preventWheelNumberChange(e) {
    e.currentTarget.blur()
  }

  function normalizeNumberOrNull(value) {
    const s = String(value ?? '').trim()
    if (!s) return null
    const n = Number(s)
    if (!Number.isFinite(n)) return NaN
    return n
  }

  async function crearProducto() {
    setError('')
    setSuccess('')

    if (!codigoTrim) {
      setError('El código es obligatorio')
      return
    }

    const precio = normalizeNumberOrNull(precioVenta)
    const costoN = normalizeNumberOrNull(costo)
    const stock = normalizeNumberOrNull(stockActual)
    const stockMin = normalizeNumberOrNull(stockMinimo)

    if (Number.isNaN(precio)) return setError('Precio de venta inválido')
    if (Number.isNaN(costoN)) return setError('Costo inválido')
    if (Number.isNaN(stock)) return setError('Stock inválido')
    if (Number.isNaN(stockMin)) return setError('Stock mínimo inválido')

    setLoading(true)
    try {
      const payload = {
        codigo: codigoTrim,
        descripcion: descripcion.trim() || null,
        precio_venta: precio,
        costo: costoN,
        stock_actual: stock ?? 0,
        stock_minimo: stockMin,
      }

      await apiJson(`/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (imagenFile) {
        const buf = await imagenFile.arrayBuffer()
        await apiJson(`/api/productos/${encodeURIComponent(codigoTrim)}/imagen`, {
          method: 'PUT',
          headers: { 'Content-Type': imagenFile.type || 'application/octet-stream' },
          body: buf,
        })
      }

      setSuccess('Producto creado')
      setCodigo('')
      setDescripcion('')
      setPrecioVenta('')
      setCosto('')
      setStockActual('')
      setStockMinimo('')
      setImagenFile(null)
      setImagenPreviewUrl('')
      codigoRef.current?.focus()
    } catch (e) {
      setError(e.message || 'No se pudo crear el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="Nuevo producto"
      subtitle="Alta rápida."
      maxWidthClassName="max-w-3xl"
    >
      <GlassCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Código</label>
            <input
              ref={codigoRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') crearProducto()
              }}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              placeholder='Ej: "02"'
              inputMode="numeric"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              placeholder="Ej: Lapicera azul"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Precio de venta</label>
            <input
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              onWheel={preventWheelNumberChange}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              step="1"
              min="0"
              placeholder="Ej: 1200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Costo</label>
            <input
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              onWheel={preventWheelNumberChange}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              step="1"
              min="0"
              placeholder="Ej: 600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Stock inicial</label>
            <input
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              onWheel={preventWheelNumberChange}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              step="1"
              min="0"
              placeholder="Ej: 20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Stock mínimo (alerta)</label>
            <input
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              onWheel={preventWheelNumberChange}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              type="number"
              step="1"
              min="0"
              placeholder="Ej: 3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-sukha-ink/80">Imagen (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImagenFile(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 text-sm outline-none focus:border-sukha-peach"
            />

            {imagenPreviewUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={imagenPreviewUrl}
                  alt="Vista previa"
                  className="h-16 w-16 rounded-xl border border-sukha-peach/50 bg-white/40 object-cover"
                />
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => {
                    setImagenFile(null)
                  }}
                >
                  Quitar imagen
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" onClick={crearProducto} disabled={loading} className="w-full font-semibold sm:w-auto">
            {loading ? 'Guardando…' : 'Guardar producto'}
          </Button>

          <Button
            type="button"
            variant="glass"
            className="w-full sm:w-auto"
            onClick={() => {
              setCodigo('')
              setDescripcion('')
              setPrecioVenta('')
              setCosto('')
              setStockActual('')
              setStockMinimo('')
              setImagenFile(null)
              setImagenPreviewUrl('')
              setError('')
              setSuccess('')
              codigoRef.current?.focus()
            }}
          >
            Limpiar
          </Button>
        </div>

        {(error || success) && (
          <div className="mt-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-lg border border-sukha-primary/40 bg-sukha-primary/20 px-3 py-2 text-sm text-sukha-ink">
                {success}
              </div>
            ) : null}
          </div>
        )}

      </GlassCard>
    </PageShell>
  )
}
