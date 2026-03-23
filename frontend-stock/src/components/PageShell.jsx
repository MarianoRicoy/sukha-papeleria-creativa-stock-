export function GlassCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-sukha-peach/40 bg-white/70 p-5 shadow-[0_10px_30px_rgba(31,31,31,0.06)] ${className}`}
    >
      {children}
    </div>
  )
}

export default function PageShell({
  title,
  subtitle,
  actions,
  maxWidthClassName = 'max-w-6xl',
  children,
}) {
  return (
    <main className={`mx-auto w-full ${maxWidthClassName} px-4 py-6 sm:py-8 lg:py-10`}>
      {title ? (
        <section className="relative overflow-hidden rounded-2xl border border-sukha-peach/40 bg-sukha-cream/70 px-5 py-5 shadow-[0_10px_30px_rgba(31,31,31,0.06)]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sukha-light/70 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-sukha-pink/45 blur-2xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-sukha-ink">{title}</h1>
              {subtitle ? <p className="text-sm text-sukha-ink/70">{subtitle}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </section>
      ) : null}

      <div className={title ? 'mt-6 sm:mt-8' : ''}>{children}</div>
    </main>
  )
}
