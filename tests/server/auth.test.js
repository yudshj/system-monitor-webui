import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authMiddleware, getAuthToken, getAuthPolicy, isTailscaleIP, isTailscaleHost } from '../../server/auth.js'

function mockReqRes(query = {}, headers = {}, extra = {}) {
  const req = { query, headers, path: '/api/test', ...extra }
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this }
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('auth', () => {
  const ORIGINAL_TOKEN = process.env.AUTH_TOKEN
  const ORIGINAL_POLICY = process.env.AUTH_POLICY

  afterEach(() => {
    if (ORIGINAL_TOKEN !== undefined) process.env.AUTH_TOKEN = ORIGINAL_TOKEN
    else delete process.env.AUTH_TOKEN
    if (ORIGINAL_POLICY !== undefined) process.env.AUTH_POLICY = ORIGINAL_POLICY
    else delete process.env.AUTH_POLICY
  })

  describe('getAuthToken', () => {
    it('returns env var value', () => {
      process.env.AUTH_TOKEN = 'test123'
      expect(getAuthToken()).toBe('test123')
    })

    it('returns empty string when not set', () => {
      delete process.env.AUTH_TOKEN
      expect(getAuthToken()).toBe('')
    })
  })

  describe('getAuthPolicy', () => {
    it('defaults to ALL', () => {
      delete process.env.AUTH_POLICY
      expect(getAuthPolicy()).toBe('ALL')
    })

    it('accepts SKIP_TAILSCALE', () => {
      process.env.AUTH_POLICY = 'SKIP_TAILSCALE'
      expect(getAuthPolicy()).toBe('SKIP_TAILSCALE')
    })

    it('accepts NONE', () => {
      process.env.AUTH_POLICY = 'NONE'
      expect(getAuthPolicy()).toBe('NONE')
    })

    it('is case-insensitive', () => {
      process.env.AUTH_POLICY = 'skip_tailscale'
      expect(getAuthPolicy()).toBe('SKIP_TAILSCALE')
    })

    it('falls back to ALL for invalid values', () => {
      process.env.AUTH_POLICY = 'INVALID'
      expect(getAuthPolicy()).toBe('ALL')
    })
  })

  describe('isTailscaleIP', () => {
    it('detects 100.64.x.x as Tailscale', () => {
      expect(isTailscaleIP('100.64.0.1')).toBe(true)
      expect(isTailscaleIP('100.100.100.100')).toBe(true)
      expect(isTailscaleIP('100.127.255.255')).toBe(true)
    })

    it('rejects non-Tailscale IPs', () => {
      expect(isTailscaleIP('192.168.1.1')).toBe(false)
      expect(isTailscaleIP('10.0.0.1')).toBe(false)
      expect(isTailscaleIP('100.128.0.1')).toBe(false) // outside /10
      expect(isTailscaleIP('100.63.255.255')).toBe(false) // below range
    })

    it('handles IPv4-mapped IPv6', () => {
      expect(isTailscaleIP('::ffff:100.64.0.7')).toBe(true)
      expect(isTailscaleIP('::ffff:192.168.1.1')).toBe(false)
    })

    it('detects Tailscale IPv6 (fd7a:115c:a1e0::/48)', () => {
      expect(isTailscaleIP('fd7a:115c:a1e0::1')).toBe(true)
      expect(isTailscaleIP('fd7a:115c:a1e0:ab12::1')).toBe(true)
    })

    it('handles null/empty', () => {
      expect(isTailscaleIP('')).toBe(false)
      expect(isTailscaleIP(null)).toBe(false)
      expect(isTailscaleIP(undefined)).toBe(false)
    })
  })

  describe('isTailscaleHost', () => {
    it('detects *.ts.net hosts', () => {
      expect(isTailscaleHost('arch.anoa-qilin.ts.net')).toBe(true)
      expect(isTailscaleHost('mac.example.ts.net:3001')).toBe(true)
    })

    it('rejects non-ts.net hosts', () => {
      expect(isTailscaleHost('example.com')).toBe(false)
      expect(isTailscaleHost('localhost')).toBe(false)
      expect(isTailscaleHost('ts.net.evil.com')).toBe(false)
    })

    it('handles null/empty', () => {
      expect(isTailscaleHost('')).toBe(false)
      expect(isTailscaleHost(null)).toBe(false)
    })
  })

  describe('authMiddleware — no token configured', () => {
    beforeEach(() => { delete process.env.AUTH_TOKEN; delete process.env.AUTH_POLICY })

    it('allows all requests when AUTH_TOKEN not set', () => {
      const { req, res, next } = mockReqRes()
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('authMiddleware — NONE policy', () => {
    beforeEach(() => { process.env.AUTH_TOKEN = 'secret42'; process.env.AUTH_POLICY = 'NONE' })

    it('allows all requests regardless of token', () => {
      const { req, res, next } = mockReqRes()
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('authMiddleware — static assets bypass', () => {
    beforeEach(() => { process.env.AUTH_TOKEN = 'secret42'; delete process.env.AUTH_POLICY })

    it('allows .js files without token', () => {
      const { req, res, next } = mockReqRes()
      req.path = '/assets/index-abc123.js'
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows .css files without token', () => {
      const { req, res, next } = mockReqRes()
      req.path = '/assets/style-xyz.css'
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows .svg files without token', () => {
      const { req, res, next } = mockReqRes()
      req.path = '/favicon.svg'
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows .woff2 files without token', () => {
      const { req, res, next } = mockReqRes()
      req.path = '/fonts/inter.woff2'
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('still blocks non-static paths', () => {
      const { req, res, next } = mockReqRes()
      req.path = '/api/metrics/cpu'
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })
  })

  describe('authMiddleware — ALL policy (default)', () => {
    beforeEach(() => { process.env.AUTH_TOKEN = 'secret42'; delete process.env.AUTH_POLICY })

    it('allows request with correct query token', () => {
      const { req, res, next } = mockReqRes({ token: 'secret42' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows request with correct Bearer header', () => {
      const { req, res, next } = mockReqRes({}, { authorization: 'Bearer secret42' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('rejects request with wrong token', () => {
      const { req, res, next } = mockReqRes({ token: 'wrong' })
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })

    it('rejects request with no token', () => {
      const { req, res, next } = mockReqRes()
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })

    it('rejects Tailscale IP without token in ALL mode', () => {
      const { req, res, next } = mockReqRes({}, {}, { ip: '100.64.0.7' })
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })
  })

  describe('authMiddleware — SKIP_TAILSCALE policy', () => {
    beforeEach(() => { process.env.AUTH_TOKEN = 'secret42'; process.env.AUTH_POLICY = 'SKIP_TAILSCALE' })

    it('allows Tailscale IPv4 without token', () => {
      const { req, res, next } = mockReqRes({}, {}, { ip: '100.64.0.7' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows Tailscale IPv4-mapped IPv6 without token', () => {
      const { req, res, next } = mockReqRes({}, {}, { ip: '::ffff:100.100.50.1' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows *.ts.net Host header without token', () => {
      const { req, res, next } = mockReqRes({}, { host: 'arch.anoa-qilin.ts.net' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('allows *.ts.net Host with port', () => {
      const { req, res, next } = mockReqRes({}, { host: 'arch.anoa-qilin.ts.net:3001' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('still requires token for non-Tailscale IPs', () => {
      const { req, res, next } = mockReqRes({}, {}, { ip: '203.0.113.5' })
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })

    it('allows non-Tailscale IP with valid token', () => {
      const { req, res, next } = mockReqRes({ token: 'secret42' }, {}, { ip: '203.0.113.5' })
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('uses socket.remoteAddress as fallback', () => {
      const { req, res, next } = mockReqRes()
      req.socket = { remoteAddress: '100.64.0.7' }
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
    })
  })
})
