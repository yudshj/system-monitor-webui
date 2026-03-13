/**
 * Extract and manage auth token from URL query param.
 * Token is stored in sessionStorage so it persists across tab navigation
 * but not across browser sessions.
 */

const TOKEN_KEY = 'status_monitor_token'

export function initToken() {
  const params = new URLSearchParams(window.location.search)
  const urlToken = params.get('token')
  if (urlToken) {
    sessionStorage.setItem(TOKEN_KEY, urlToken)
    // Clean URL (remove token from address bar for security)
    const clean = new URL(window.location)
    clean.searchParams.delete('token')
    window.history.replaceState({}, '', clean.pathname + clean.search)
  }
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

/**
 * Build API URL with token query param
 */
export function apiUrl(path) {
  const token = getToken()
  const sep = path.includes('?') ? '&' : '?'
  return token ? `${path}${sep}token=${encodeURIComponent(token)}` : path
}

/**
 * Fetch wrapper that includes token
 */
export async function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options)
}
