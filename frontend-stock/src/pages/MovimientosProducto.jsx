import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { apiJson } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import { Table, TableShell, TBody, TD, TH, THead, TR } from '../components/ui/TableShell.jsx'

function formatMoneyAr(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

export default function MovimientosProducto() {
  const params = useParams()
  const codigo = useMemo(() => String(params.codigo || '').trim(), [params.codigo])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [producto, setProducto] = useState(null)
  const [movimientos, setMovimientos] = useState([])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!codigo) return
      setError('')
      setLoading(true)
      try {
        const data = await apiJson(`/api/productos/${encodeURIComponent(codigo)}/movimientos?limit=100`)
        if (cancelled) return
        setProducto(data?.producto ?? null)
        setMovimientos(Array.isArray(data?.movimientos) ? data.movimientos : [])
      } catch (e) {
        if (cancelled) return
        setProducto(null)
        setMovimientos([])
        setError(e.message || 'No se pudieron cargar los movimientos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [codigo])

  return (
    <PageShell
      title="Movimientos"
      subtitle={codigo ? `Kardex del producto ${codigo}.` : 'Kardex del producto.'}
      actions={
        <Link
          to={`/productos?q=${encodeURIComponent(codigo)}`}
          className="inline-flex items-center justify-center rounded-xl border border-sukha-peach/60 bg-white/60 px-4 py-2 text-sm font-semibold text-sukha-ink shadow-sm hover:bg-white/70"
        >
          Volver
        </Link>
      }
    >
      <GlassCard>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-1 rounded-lg border border-sukha-peach/50 bg-white/50 p-4">
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
                      <div className="text-sukha-ink/70">Precio: {formatMoneyAr(producto.precio_venta)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sukha-ink/70">{loading ? 'Cargando…' : '—'}</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Stock actual</div>
              <div className="mt-1 text-sm text-sukha-ink">
                {producto ? (
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{producto.stock_actual}</div>
                    {producto.stock_minimo != null && Number(producto.stock_actual) <= Number(producto.stock_minimo) ? (
                      <span className="rounded-full border border-sukha-peach/60 bg-white/50 px-2 py-0.5 text-[11px] font-medium text-sukha-ink/80">
                        Bajo
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sukha-ink/70">—</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Stock mínimo</div>
              <div className="mt-1 text-sm text-sukha-ink">
                {producto ? (
                  <div className="font-semibold">{producto.stock_minimo ?? '—'}</div>
                ) : (
                  <div className="text-sukha-ink/70">—</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <TableShell className="mt-4">
          <Table>
            <THead>
              <tr>
                <TH>Fecha</TH>
                <TH>Tipo</TH>
                <TH className="text-right">Cantidad</TH>
                <TH className="text-right">Precio</TH>
                <TH className="text-right">Costo</TH>
                <TH>Referencia</TH>
              </tr>
            </THead>
            <TBody>
              {movimientos.length === 0 ? (
                <tr>
                  <TD className="py-3 text-sukha-ink/70" colSpan={6}>
                    {loading ? 'Cargando...' : 'Sin movimientos'}
                  </TD>
                </tr>
              ) : (
                movimientos.map((m, idx) => (
                  <TR key={`${m.tipo}-${m.ref?.id_ingreso ?? m.ref?.id_detalle ?? idx}`}
                    className={m.tipo === 'venta' ? 'bg-white/0' : ''}
                  >
                    <TD className="whitespace-nowrap">{formatDateTime(m.fecha)}</TD>
                    <TD className="capitalize">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          m.tipo === 'venta'
                            ? 'border-sukha-peach/60 bg-white/50 text-sukha-ink/80'
                            : 'border-sukha-primary/50 bg-sukha-primary/15 text-sukha-ink'
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </TD>
                    <TD className={`text-right font-semibold ${m.cantidad < 0 ? 'text-red-700' : 'text-sukha-ink'}`}>
                      {m.cantidad}
                    </TD>
                    <TD className="text-right">{formatMoneyAr(m.precio_unitario)}</TD>
                    <TD className="text-right">{formatMoneyAr(m.costo_unitario)}</TD>
                    <TD className="text-xs text-sukha-ink/70">
                      {m.tipo === 'ingreso'
                        ? `Ingreso #${m.ref?.id_ingreso ?? ''}`
                        : `Venta #${m.ref?.id_venta ?? ''}`}
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
