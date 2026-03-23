import { useEffect, useMemo, useState } from 'react'

import { apiJson } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'
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

function formatPercentAr(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(n)
}

export default function Reportes() {
  const now = useMemo(() => new Date(), [])
  const [mes, setMes] = useState(String(now.getMonth() + 1))
  const [anio, setAnio] = useState(String(now.getFullYear()))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [unidades, setUnidades] = useState(null)
  const [financiero, setFinanciero] = useState(null)

  const mesNum = useMemo(() => Number(String(mes).trim()), [mes])
  const anioNum = useMemo(() => Number(String(anio).trim()), [anio])

  function preventWheelNumberChange(e) {
    e.currentTarget.blur()
  }

  async function generar() {
    setError('')
    setUnidades(null)
    setFinanciero(null)

    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      setError('Mes inválido (1-12)')
      return
    }
    if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
      setError('Año inválido (2000-2100)')
      return
    }

    setLoading(true)
    try {
      const uUrl = new URL(`/api/reportes/unidades`, window.location.origin)
      uUrl.searchParams.set('mes', String(mesNum))
      uUrl.searchParams.set('anio', String(anioNum))

      const fUrl = new URL(`/api/reportes/financiero`, window.location.origin)
      fUrl.searchParams.set('mes', String(mesNum))
      fUrl.searchParams.set('anio', String(anioNum))

      const [uData, fData] = await Promise.all([
        apiJson(`${uUrl.pathname}${uUrl.search}`),
        apiJson(`${fUrl.pathname}${fUrl.search}`),
      ])

      setUnidades(uData)
      setFinanciero(fData)
    } catch (e) {
      setError(e.message || 'No se pudieron generar los reportes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageShell
      title="Reportes"
      subtitle="Unidades y reporte financiero por mes."
      actions={
        <Button type="button" variant="glass" className="print-hide font-semibold" onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </Button>
      }
    >
      <div id="print-area">
        <GlassCard>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6 print-hide">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-sukha-ink/80">Mes</label>
              <input
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                onWheel={preventWheelNumberChange}
                className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
                type="number"
                min="1"
                max="12"
                step="1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-sukha-ink/80">Año</label>
              <input
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                onWheel={preventWheelNumberChange}
                className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
                type="number"
                min="2000"
                max="2100"
                step="1"
              />
            </div>

            <div className="md:col-span-2 md:flex md:items-end">
              <Button
                type="button"
                onClick={generar}
                disabled={loading}
                className="mt-2 w-full font-semibold md:mt-0"
              >
                {loading ? 'Generando…' : 'Generar'}
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

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-sukha-peach/50 bg-white/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Unidades</div>

            <TableShell className="mt-3">
              <Table>
                <THead>
                  <tr>
                    <TH>Código</TH>
                    <TH>Unidades</TH>
                  </tr>
                </THead>
                <TBody>
                  {!unidades ? (
                    <tr>
                      <TD className="py-3 text-sukha-ink/70" colSpan={2}>
                        {loading ? 'Cargando...' : '—'}
                      </TD>
                    </tr>
                  ) : (unidades?.items || []).length === 0 ? (
                    <tr>
                      <TD className="py-3 text-sukha-ink/70" colSpan={2}>
                        Sin ventas
                      </TD>
                    </tr>
                  ) : (
                    (unidades.items || []).map((row) => (
                      <TR key={row.codigo_producto}>
                        <TD className="font-mono">{row.codigo_producto}</TD>
                        <TD className="font-semibold">{row.unidades}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </TableShell>
          </div>

          <div className="rounded-lg border border-sukha-peach/50 bg-white/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Financiero</div>

            {!financiero ? (
              <div className="mt-3 text-sm text-sukha-ink/70">{loading ? 'Cargando...' : '—'}</div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-sukha-peach/40 bg-white/50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Facturado</div>
                    <div className="mt-1 text-base font-semibold text-sukha-ink">
                      {formatMoneyAr(financiero.total_facturado)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-sukha-peach/40 bg-white/50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Costo</div>
                    <div className="mt-1 text-base font-semibold text-sukha-ink">
                      {formatMoneyAr(financiero.total_costo)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-sukha-primary/40 bg-sukha-primary/15 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Utilidad</div>
                    <div className="mt-1 text-base font-semibold text-sukha-ink">
                      {formatMoneyAr(financiero.utilidad)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-sukha-peach/40 bg-white/50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sukha-ink/60">Margen</div>
                    <div className="mt-1 text-base font-semibold text-sukha-ink">
                      {formatPercentAr(
                        Number(financiero.total_facturado) > 0
                          ? Number(financiero.utilidad) / Number(financiero.total_facturado)
                          : 0
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-sukha-ink/60">
                  Período: {String(financiero.desde || '').slice(0, 10)} a {String(financiero.hasta || '').slice(0, 10)}
                </div>
              </div>
            )}
          </div>
        </div>

        </GlassCard>
      </div>
    </PageShell>
  )
}
