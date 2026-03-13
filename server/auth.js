/**
 * Token-based authentication middleware.
 *
 * Environment variables:
 *   AUTH_TOKEN  - Required token for access. If unset, all requests are open.
 *   AUTH_POLICY - Controls when token is required:
 *     "ALL"            - Always require token (default)
 *     "SKIP_TAILSCALE" - Skip token for Tailscale IPs (100.64.0.0/10, fd7a:115c:a1e0::/48)
 *                        and *.ts.net Host headers
 *     "NONE"           - No token required (fully open, same as no AUTH_TOKEN)
 *
 * Clients pass token via ?token= query param or Authorization: Bearer header.
 *
 * Static assets (.js, .css, .svg, .ico, .png, .jpg, .woff, .woff2, .ttf, .map)
 * are always allowed — the browser can't append query params to resource requests.
 */

const STATIC_EXT = /\.(js|css|svg|ico|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|map)$/i

// Tailscale CGNAT range: 100.64.0.0/10 = 100.64.0.0 – 100.127.255.255
const TS_IPV4_BASE = 0x64400000  // 100.64.0.0
const TS_IPV4_MASK = 0xFFC00000  // /10

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isLoopback(ip) {
  if (!ip) return false
  const cleaned = ip.replace(/^::ffff:/i, '')
  return cleaned === '127.0.0.1' || cleaned === '::1' || cleaned === 'localhost'
}

function isTailscaleIP(ip) {
  if (!ip) return false
  // Strip ::ffff: prefix (IPv4-mapped IPv6)
  const cleaned = ip.replace(/^::ffff:/i, '')

  // Tailscale IPv6: fd7a:115c:a1e0::/48
  if (ip.startsWith('fd7a:115c:a1e0:')) return true

  // Tailscale IPv4: 100.64.0.0/10
  const n = ipv4ToInt(cleaned)
  if (n === null) return false
  return (n & TS_IPV4_MASK) === TS_IPV4_BASE
}

function isTailscaleHost(host) {
  if (!host) return false
  // Strip port if present
  const hostname = host.replace(/:\d+$/, '')
  return hostname.endsWith('.ts.net')
}

export function getAuthToken() {
  return process.env.AUTH_TOKEN || ''
}

export function getAuthPolicy() {
  const policy = (process.env.AUTH_POLICY || 'ALL').toUpperCase().trim()
  if (['ALL', 'SKIP_TAILSCALE', 'NONE'].includes(policy)) return policy
  return 'ALL'
}

// Exported for testing
export { isLoopback, isTailscaleIP, isTailscaleHost }

export function authMiddleware(req, res, next) {
  const expected = getAuthToken()
  const policy = getAuthPolicy()

  // No token configured or NONE policy = open access
  if (!expected || policy === 'NONE') return next()

  // Always allow static assets
  if (STATIC_EXT.test(req.path)) return next()

  // Always allow localhost
  const clientIP = req.ip || req.socket?.remoteAddress || ''
  if (isLoopback(clientIP)) return next()

  // SKIP_TAILSCALE: allow requests from Tailscale network
  if (policy === 'SKIP_TAILSCALE') {
    if (isTailscaleIP(clientIP)) return next()
    if (isTailscaleHost(req.headers?.host)) return next()
  }

  // Check query param
  const queryToken = req.query?.token
  if (queryToken === expected) return next()

  // Check Authorization header
  const authHeader = req.headers?.authorization
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, '')
    if (bearer === expected) return next()
  }

  return res.status(403).json({ error: 'Forbidden: invalid or missing token' })
}
