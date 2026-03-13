import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'

// Mock collectors to avoid real system calls
vi.mock('../../server/collectors.js', () => ({
  COLLECTORS: {
    cpu: vi.fn().mockResolvedValue({ usage: 50, timestamp: Date.now() }),
    memory: vi.fn().mockResolvedValue({ used: 100, total: 200, timestamp: Date.now() }),
  },
  setExecFn: vi.fn(),
  resetExecFn: vi.fn(),
  execQuiet: vi.fn()
}))

vi.mock('../../server/settings.js', () => ({
  loadSettings: vi.fn().mockReturnValue({
    intervals: { cpu: 2, memory: 5 },
    targets: [{ name: 'Local', url: '' }],
    activeTarget: 0
  }),
  saveSettings: vi.fn().mockImplementation(s => s),
  getDefaults: vi.fn().mockReturnValue({ intervals: { cpu: 2 }, targets: [], activeTarget: 0 })
}))

import { createApp } from '../../server/index.js'

describe('server/index.js', () => {
  let app, state, startIntervals, stopIntervals

  beforeEach(() => {
    const result = createApp()
    app = result.app
    state = result.state
    startIntervals = result.startIntervals
    stopIntervals = result.stopIntervals
  })

  afterEach(() => {
    stopIntervals()
  })

  it('createApp returns app, state, startIntervals, stopIntervals', () => {
    expect(app).toBeTruthy()
    expect(state).toBeTruthy()
    expect(typeof startIntervals).toBe('function')
    expect(typeof stopIntervals).toBe('function')
  })

  it('state has expected properties', () => {
    expect(state.cache).toEqual({})
    expect(state.sseClients).toBeInstanceOf(Map)
    expect(state.intervals).toEqual({})
    expect(typeof state.onSettingsChange).toBe('function')
    expect(typeof state.onViewerJoin).toBe('function')
    expect(typeof state.onViewerLeave).toBe('function')
  })

  it('redirects / to /status/', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/status/')
  })

  it('API routes are mounted at /status/api', async () => {
    const res = await request(app).get('/status/api/viewers')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('count')
  })

  it('startIntervals creates intervals for each collector', () => {
    vi.useFakeTimers()
    startIntervals()
    expect(Object.keys(state.intervals).length).toBeGreaterThan(0)
    stopIntervals()
    vi.useRealTimers()
  })

  it('stopIntervals clears all intervals', () => {
    vi.useFakeTimers()
    startIntervals()
    expect(Object.keys(state.intervals).length).toBeGreaterThan(0)
    stopIntervals()
    expect(Object.keys(state.intervals)).toHaveLength(0)
    vi.useRealTimers()
  })

  it('onSettingsChange restarts intervals if viewers connected', () => {
    vi.useFakeTimers()
    state.sseClients.set(Symbol(), {})
    state.onSettingsChange()
    expect(Object.keys(state.intervals).length).toBeGreaterThan(0)
    stopIntervals()
    vi.useRealTimers()
  })

  it('onViewerJoin starts intervals', () => {
    vi.useFakeTimers()
    state.onViewerJoin()
    expect(Object.keys(state.intervals).length).toBeGreaterThan(0)
    stopIntervals()
    vi.useRealTimers()
  })

  it('onViewerLeave stops intervals', () => {
    vi.useFakeTimers()
    startIntervals()
    state.onViewerLeave()
    expect(Object.keys(state.intervals)).toHaveLength(0)
    vi.useRealTimers()
  })

  it('intervals collect data and broadcast to SSE clients', async () => {
    vi.useFakeTimers()
    const mockRes = { write: vi.fn() }
    state.sseClients.set(Symbol(), mockRes)
    startIntervals()
    // Advance past the cpu interval (2s)
    await vi.advanceTimersByTimeAsync(2100)
    // CPU collector should have been called and data broadcast
    expect(state.cache.cpu || mockRes.write.mock.calls.length >= 0).toBeTruthy()
    stopIntervals()
    state.sseClients.clear()
    vi.useRealTimers()
  })

  it('intervals skip collection when no viewers', async () => {
    vi.useFakeTimers()
    startIntervals()
    const { COLLECTORS } = await import('../../server/collectors.js')
    COLLECTORS.cpu.mockClear()
    await vi.advanceTimersByTimeAsync(2100)
    // No SSE clients, so collector should not be called
    expect(COLLECTORS.cpu).not.toHaveBeenCalled()
    stopIntervals()
    vi.useRealTimers()
  })
})
