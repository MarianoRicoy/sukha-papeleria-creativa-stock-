import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto w-full max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Ocurrió un error</h1>
            <p className="mt-2 text-sm text-slate-600">
              Se produjo un problema al mostrar esta pantalla.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Volver al inicio
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Recargar
              </button>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
