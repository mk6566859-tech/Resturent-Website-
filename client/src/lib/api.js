const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

export async function request(path, { token, ...options } = {}) {
  if (!baseUrl) throw new Error('API is not configured. This action needs the restaurant API.')
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`)
  return data
}

export const apiConfigured = Boolean(baseUrl)
