/**
 * Token-based authentication middleware.
 * Token is set via AUTH_TOKEN env var.
 * Clients pass token via ?token= query param or Authorization: Bearer header.
 * If AUTH_TOKEN is not set, all requests are allowed (open access).
 *
 * Static assets (.js, .css, .svg, .ico, .png, .jpg, .woff, .woff2, .ttf, .map)
 * are always allowed — they contain no sensitive data, and the browser can't
 * append query params to <script>/<link> resource requests.
 */

const STATIC_EXT = /\.(js|css|svg|ico|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|map)$/i

export function getAuthToken() {
  return process.env.AUTH_TOKEN || ''
}

export function authMiddleware(req, res, next) {
  const expected = getAuthToken()

  // No token configured = open access
  if (!expected) return next()

  // Always allow static assets
  if (STATIC_EXT.test(req.path)) return next()

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
