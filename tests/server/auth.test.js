import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authMiddleware, getAuthToken } from '../../server/auth.js'

function mockReqRes(query = {}, headers = {}) {
  const req = { query, headers }
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
  const ORIGINAL_ENV = process.env.AUTH_TOKEN

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.AUTH_TOKEN = ORIGINAL_ENV
    } else {
      delete process.env.AUTH_TOKEN
    }
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

  describe('authMiddleware — no token configured', () => {
    beforeEach(() => { delete process.env.AUTH_TOKEN })

    it('allows all requests when AUTH_TOKEN not set', () => {
      const { req, res, next } = mockReqRes()
      authMiddleware(req, res, next)
      expect(next).toHaveBeenCalled()
      expect(res.statusCode).toBeNull()
    })
  })

  describe('authMiddleware — token configured', () => {
    beforeEach(() => { process.env.AUTH_TOKEN = 'secret42' })

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
      expect(res.body.error).toContain('Forbidden')
    })

    it('rejects request with no token', () => {
      const { req, res, next } = mockReqRes()
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })

    it('rejects request with wrong Bearer header', () => {
      const { req, res, next } = mockReqRes({}, { authorization: 'Bearer wrongtoken' })
      authMiddleware(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    })
  })
})
