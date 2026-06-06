import { useEffect } from 'react'
import logo from '../assets/logo sukha nombe.png'

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sukha-ink/50 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white/80 backdrop-blur transition hover:bg-white/30 hover:text-white"
        aria-label="Cerrar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        className="relative flex flex-col items-center gap-5 px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || 'Imagen del producto'}
          className="max-h-[70vh] max-w-[85vw] rounded-2xl border border-white/20 object-contain shadow-2xl sm:max-h-[75vh] sm:max-w-[70vw]"
          draggable={false}
        />
        <img
          src={logo}
          alt="Sukha"
          className="h-6 opacity-40"
          draggable={false}
        />
      </div>
    </div>
  )
}
