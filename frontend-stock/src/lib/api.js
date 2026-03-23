export const API_URL = import.meta.env.VITE_API_URL ?? ''

const __jsonCache = new Map()

function getCacheEntry(key) {
  const entry = __jsonCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    __jsonCache.delete(key)
    return null
  }
  return entry
}

function setCacheEntry(key, ttlMs, value) {
  const expiresAt = Date.now() + Math.max(0, Number(ttlMs) || 0)
  __jsonCache.set(key, { expiresAt, value })
}

export function getStoredPin() {
  return localStorage.getItem('app_pin') || ''
}

export function clearStoredPin() {
  localStorage.removeItem('app_pin')
}

export function setStoredPin(pin) {
  localStorage.setItem('app_pin', pin)
}

export async function apiFetch(path, options = {}) {
  const pin = getStoredPin()

  const headers = new Headers(options.headers || {})
  if (pin) headers.set('x-app-pin', pin)

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearStoredPin()
    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  }

  return res
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options)

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`
    throw Object.assign(new Error(msg), { status: res.status, payload: data })
  }

  return data
}

export async function apiJsonCached(path, options = {}, cache = {}) {
  const method = String(options?.method || 'GET').toUpperCase()
  const ttlMs = Number(cache?.ttlMs ?? 3000)
  const cacheKey = String(cache?.key || `${method}:${path}`)

  if (method !== 'GET' || ttlMs <= 0) {
    return apiJson(path, options)
  }

  const existing = getCacheEntry(cacheKey)
  if (existing) return existing.value

  const data = await apiJson(path, options)
  setCacheEntry(cacheKey, ttlMs, data)
  return data
}
