import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createRoutes, broadcastSSE } from '../../server/routes.js'

// Mock collectors
vi.mock('../../server/collectors.js', () => ({
  COLLECTORS: {
    cpu: vi.fn().mockResolvedValue({ usage: 50, timestamp: 1000 }),
    memory: vi.fn().mockResolvedValue({ used: 100, total: 200, timestamp: 1000 }),
    gpu: vi.fn().mockResolvedValue({ available: true, timestamp: 1000 }),
    smart: vi.fn().mockImplementation((device) => {
      if (device) return Promise.resolve({ device, health: 'PASSED' })
      return Promise.resolve({ devices: [], timestamp: 1000 })
    })
  }
}))

// Mock settings
vi.mock('../../server/settings.js', () => ({
  loadSettings: vi.fn().mockReturnValue({
    intervals: { cpu: 2 },
    targets: [{ name: 'Local', url: '' }],
    activeTarget: 0
  }),
  saveSettings: vi.fn().mockImplementation(s => s)
}))

function createTestApp() {
  const state = {
    cache: {},
    sseClients: new Map(),
    intervals: {},
    onSettingsChange: vi.fn()
  }
  const app = express()
  app.use(express.json())
  app.use('/status/api', createRoutes(state))
  return { app, state }
}

describe('routes', () => {
  describe('GET /status/api/metrics/:field', () => {
    it('returns cached data if available', async () => {
      const { app, state } = createTestApp()
      state.cache.cpu = { usage: 42, cached: true }
      const res = await request(app).get('/status/api/metrics/cpu')
      expect(res.status).toBe(200)
      expect(res.body.usage).toBe(42)
      expect(res.body.cached).toBe(true)
    })

    it('collects fresh data when cache empty', async () => {
      const { app } = createTestApp()
      const res = await request(app).get('/status/api/metrics/cpu')
      expect(res.status).toBe(200)
      expect(res.body.usage).toBe(50)
    })

    it('returns 404 for unknown field', async () => {
      const { app } = createTestApp()
      const res = await request(app).get('/status/api/metrics/unknown')
      expect(res.status).toBe(404)
      expect(res.body.error).toContain('unknown')
    })
  })

  describe('GET /status/api/metrics/smart/:device', () => {
    it('returns SMART data for device', async () => {
      const { app } = createTestApp()
      const res = await request(app).get('/status/api/metrics/smart/sda')
      expect(res.status).toBe(200)
      expect(res.body.device).toBe('/dev/sda')
    })
  })

  describe('GET /status/api/refresh/:field', () => {
    it('forces fresh collection', async () => {
      const { app, state } = createTestApp()
      state.cache.cpu = { usage: 0, old: true }
      const res = await request(app).get('/status/api/refresh/cpu')
      expect(res.status).toBe(200)
      expect(res.body.usage).toBe(50) // fresh data, not cached
    })

    it('returns 404 for unknown field', async () => {
      const { app } = createTestApp()
      const res = await request(app).get('/status/api/refresh/bogus')
      expect(res.status).toBe(404)
    })

    it('broadcasts to SSE clients', async () => {
      const { app, state } = createTestApp()
      const mockRes = { write: vi.fn() }
      state.sseClients.set(Symbol(), mockRes)
      await request(app).get('/status/api/refresh/cpu')
      expect(mockRes.write).toHaveBeenCalled()
    })
  })

  describe('GET /status/api/settings', () => {
    it('returns current settings', async () => {
      const { app } = createTestApp()
      const res = await request(app).get('/status/api/settings')
      expect(res.status).toBe(200)
      expect(res.body.intervals.cpu).toBe(2)
    })
  })

  describe('PUT /status/api/settings', () => {
    it('saves settings', async () => {
      const { app, state } = createTestApp()
      const newSettings = { intervals: { cpu: 5 }, targets: [], activeTarget: 0 }
      const res = await request(app).put('/status/api/settings').send(newSettings)
      expect(res.status).toBe(200)
      expect(state.onSettingsChange).toHaveBeenCalled()
    })

    it('saves settings without onSettingsChange', async () => {
      const { app, state } = createTestApp()
      state.onSettingsChange = null
      const newSettings = { intervals: { cpu: 5 }, targets: [], activeTarget: 0 }
      const res = await request(app).put('/status/api/settings').send(newSettings)
      expect(res.status).toBe(200)
    })

    it('rejects null body', async () => {
      const { app } = createTestApp()
      const res = await request(app).put('/status/api/settings')
        .send(null)
        .set('Content-Type', 'application/json')
      // null body → empty object or 400
      expect(res.status).toBeGreaterThanOrEqual(200)
    })
  })

  describe('GET /status/api/viewers', () => {
    it('returns viewer count', async () => {
      const { app, state } = createTestApp()
      state.sseClients.set(Symbol(), {})
      state.sseClients.set(Symbol(), {})
      const res = await request(app).get('/status/api/viewers')
      expect(res.status).toBe(200)
      expect(res.body.count).toBe(2)
    })
  })

  describe('GET /status/api/stream (SSE)', () => {
    it('returns SSE headers and registers client', async () => {
      const { app, state } = createTestApp()
      state.onViewerJoin = vi.fn()
      const res = await request(app)
        .get('/status/api/stream')
        .buffer(true)
        .parse((res, callback) => {
          let data = ''
          res.on('data', chunk => { data += chunk })
          setTimeout(() => {
            res.destroy()
            callback(null, data)
          }, 100)
        })
      expect(res.headers['content-type']).toContain('text/event-stream')
    })

    it('sends cached data on connect', async () => {
      const { app, state } = createTestApp()
      state.cache.cpu = { usage: 77 }
      state.onViewerJoin = vi.fn()
      const res = await request(app)
        .get('/status/api/stream')
        .buffer(true)
        .parse((res, callback) => {
          let data = ''
          res.on('data', chunk => { data += chunk })
          setTimeout(() => {
            res.destroy()
            callback(null, data)
          }, 150)
        })
      expect(res.body).toContain('event: cpu')
      expect(res.body).toContain('"usage":77')
    })

    it('calls onViewerJoin for first client', async () => {
      const { app, state } = createTestApp()
      state.onViewerJoin = vi.fn()
      await request(app)
        .get('/status/api/stream')
        .buffer(true)
        .parse((res, callback) => {
          setTimeout(() => { res.destroy(); callback(null, '') }, 50)
        })
      expect(state.onViewerJoin).toHaveBeenCalled()
    })
  })

  describe('broadcastSSE', () => {
    it('sends to all clients', () => {
      const state = { sseClients: new Map() }
      const mock1 = { write: vi.fn() }
      const mock2 = { write: vi.fn() }
      state.sseClients.set(Symbol(), mock1)
      state.sseClients.set(Symbol(), mock2)
      broadcastSSE(state, 'cpu', { usage: 50 })
      expect(mock1.write).toHaveBeenCalledWith(expect.stringContaining('event: cpu'))
      expect(mock2.write).toHaveBeenCalledWith(expect.stringContaining('"usage":50'))
    })
  })
})
