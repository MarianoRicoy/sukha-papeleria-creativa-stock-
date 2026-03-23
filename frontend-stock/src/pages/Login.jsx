import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Player } from '@lottiefiles/react-lottie-player'
import { API_URL, getStoredPin, setStoredPin } from '../lib/api.js'
import oopsErrorAnim from '../assets/Oops error new.json'
import sukhaLogo from '../assets/logo sukha nombe.png'
import fondoVarios from '../assets/FondoVarios.png'

class LocalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = useMemo(() => location.state?.from || '/', [location.state])

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [pinIncorrecto, setPinIncorrecto] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    const stored = getStoredPin()
    if (stored) {
      navigate(from, { replace: true })
      return
    }
    inputRef.current?.focus()
  }, [from, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setPinIncorrecto(false)

    const value = String(pin).trim()
    if (!value) {
      setError('Ingresá el PIN')
      return
    }
    if (!/^\d{4,6}$/.test(value)) {
      setError('PIN inválido (4 a 6 dígitos)')
      return
    }

    try {
      const res = await fetch(`${API_URL}/auth/pin-check`, {
        headers: { 'x-app-pin': value },
      })

      if (res.status === 204) {
        setStoredPin(value)
        navigate(from, { replace: true })
        return
      }

      if (res.status === 401) {
        setError('PIN incorrecto')
        setPinIncorrecto(true)
        setShake(true)
        inputRef.current?.focus()
        inputRef.current?.select?.()
        return
      }

      const data = await res.json().catch(() => null)
      setError(data?.error || 'No se pudo validar el PIN')
    } catch (e2) {
      setError(e2?.message || 'No se pudo validar el PIN')
    }
  }

  useEffect(() => {
    if (!shake) return
    const id = setTimeout(() => setShake(false), 450)
    return () => clearTimeout(id)
  }, [shake])

  return (
    <main
      className="relative min-h-screen w-full px-4 py-12"
      style={{
        backgroundImage: `url(${fondoVarios})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-sukha-cream/70" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-sukha-peach/60 bg-gradient-to-b from-white/80 to-sukha-cream/70 p-6 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-semibold text-sukha-ink">Ingresar</h1>
        <p className="mt-2 text-sm text-slate-700">Ingresá el PIN para acceder.</p>

        <div className="mt-4 flex h-[170px] justify-center">
          {pinIncorrecto ? (
            <div className="pointer-events-none w-full max-w-[220px] animate-[fadeUp_0.28s_ease-out]">
              <LocalErrorBoundary>
                <Player
                  autoplay
                  keepLastFrame
                  loop={false}
                  src={oopsErrorAnim}
                  style={{ width: '100%', height: 170 }}
                />
              </LocalErrorBoundary>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <img
                src={sukhaLogo}
                alt="Sukha"
                className="max-h-[90px] w-auto opacity-90 animate-[fadeUp_0.28s_ease-out]"
                draggable={false}
              />
            </div>
          )}
        </div>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-sukha-ink">PIN</label>
            <input
              ref={inputRef}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              className={`mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-slate-400 ${
                error ? 'border-red-300' : 'border-sukha-peach/70'
              } ${shake ? 'animate-[shake_0.45s_ease-in-out]' : ''}`}
              placeholder="1234"
            />
          </div>

          <div
            role="alert"
            className={`text-sm text-red-700 transition-all duration-200 ease-out ${
              error ? 'max-h-20 translate-y-0 opacity-100' : 'max-h-0 -translate-y-1 opacity-0'
            }`}
          >
            {error ? <div className="mt-1">{error}</div> : null}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-sukha-primary px-3 py-2 text-sm font-semibold text-sukha-ink transition hover:brightness-95 hover:shadow-sm"
          >
            Entrar
          </button>
        </form>
        </div>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}@keyframes fadeUp{0%{opacity:0;transform:translateY(6px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </main>
  )
}
