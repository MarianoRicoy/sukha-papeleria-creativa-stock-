export function TableShell({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-sukha-peach/50 bg-white/40 ${className}`}>
      {children}
    </div>
  )
}

export function Table({ children, className = '' }) {
  return <table className={`w-full min-w-max text-left text-sm ${className}`}>{children}</table>
}

export function THead({ children, className = '' }) {
  return (
    <thead className={`bg-white/40 text-xs font-semibold uppercase tracking-wide text-sukha-ink/70 ${className}`}>
      {children}
    </thead>
  )
}

export function TBody({ children, className = '' }) {
  return <tbody className={`divide-y divide-sukha-peach/30 ${className}`}>{children}</tbody>
}

export function TR({ children, className = '' }) {
  return <tr className={`hover:bg-white/35 ${className}`}>{children}</tr>
}

export function TH({ children, className = '' }) {
  return <th className={`px-3 py-2 ${className}`}>{children}</th>
}

export function TD({ children, className = '' }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>
}
