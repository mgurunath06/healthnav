export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function apiFetch(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers ?? {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await resp.json().catch(() => null)
  if (!resp.ok) {
    const message = data?.detail ?? data?.message ?? 'Request failed'
    throw new Error(typeof message === 'string' ? message : 'Request failed')
  }
  return data
}
