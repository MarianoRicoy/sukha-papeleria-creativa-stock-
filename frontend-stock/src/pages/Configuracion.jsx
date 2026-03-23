import { useEffect, useRef, useState } from 'react'
import { apiJson, setStoredPin } from '../lib/api.js'
import PageShell, { GlassCard } from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'

export default function Configuracion() {
  const [nuevoPin, setNuevoPin] = useState('')
  const [confirmarPin, setConfirmarPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const pinRef = useRef(null)

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => setSuccess(''), 2500)
      return () => clearTimeout(id)
    }
  }, [success])

  function validate(pin) {
    const value = String(pin || '').trim()
    if (!/^\d{4,6}$/.test(value)) return null
    return value
  }

  async function guardar(e) {
    e?.preventDefault?.()
    setError('')
    setSuccess('')

    const p1 = validate(nuevoPin)
    const p2 = validate(confirmarPin)

    if (!p1) {
      setError('PIN inválido (4 a 6 dígitos)')
      return
    }
    if (!p2) {
      setError('Confirmación inválida')
      return
    }
    if (p1 !== p2) {
      setError('Los PIN no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await apiJson('/api/config/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_pin: p1 }),
      })

      if (res === null) {
        setStoredPin(p1)
        setNuevoPin('')
        setConfirmarPin('')
        setSuccess('PIN actualizado')
        pinRef.current?.focus()
      }
    } catch (e2) {
      setError(e2?.message || 'No se pudo actualizar el PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Configuración" subtitle="Cambiar PIN de acceso compartido." maxWidthClassName="max-w-3xl">
      <GlassCard>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={guardar}>
          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Nuevo PIN</label>
            <input
              ref={pinRef}
              value={nuevoPin}
              onChange={(e) => setNuevoPin(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              placeholder="4 a 6 dígitos"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sukha-ink/80">Confirmar PIN</label>
            <input
              value={confirmarPin}
              onChange={(e) => setConfirmarPin(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-sukha-peach/60 bg-white/70 px-3 py-2 outline-none focus:border-sukha-peach"
              placeholder="Repetir PIN"
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={loading} className="w-full font-semibold sm:w-auto">
              {loading ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-lg border border-sukha-primary/40 bg-sukha-primary/20 px-3 py-2 text-sm text-sukha-ink">
            {success}
          </div>
        ) : null}

        <div className="mt-4 text-xs text-sukha-ink/60">
          Después de cambiarlo, el acceso va a requerir el nuevo PIN en todos los dispositivos.
        </div>
      </GlassCard>
    </PageShell>
  )
}
