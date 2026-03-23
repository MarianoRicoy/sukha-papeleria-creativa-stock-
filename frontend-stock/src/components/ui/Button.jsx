export default function Button({ variant = 'ink', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sukha-primary/40 focus:ring-offset-2 focus:ring-offset-sukha-cream disabled:opacity-60 hover:brightness-95 hover:shadow-sm'

  const variants = {
    primary: 'bg-sukha-primary text-sukha-ink',
    ink: 'bg-sukha-ink text-white',
    glass:
      'border border-sukha-peach/60 bg-white/50 text-sukha-ink/80 hover:bg-white/70 hover:text-sukha-ink',
    danger:
      'border border-red-200 bg-red-50/70 text-red-800 hover:bg-red-50 hover:text-red-900',
  }

  const variantClass = variants[variant] ?? variants.ink

  return <button className={`${base} ${variantClass} ${className}`} {...props} />
}
