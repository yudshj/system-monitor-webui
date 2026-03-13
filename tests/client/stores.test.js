import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { useMetricsStore } from '../../src/stores/metrics.js'
import { useSettingsStore } from '../../src/stores/settings.js'

describe('metrics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })

  it('initializes with null values', () => {
    const store = useMetricsStore()
    expect(store.cpu).toBeNull()
    expect(store.memory).toBeNull()
    expect(store.gpu).toBeNull()
    expect(store.viewers).toBe(0)
    expect(store.cpuHistory).toEqual([])
    expect(store.memHistory).toEqual([])
  })

  it('updateField sets cpu data and appends to history', () => {
    const store = useMetricsStore()
    store.updateField('cpu', { usage: 42, timestamp: 1000 })
    expect(store.cpu.usage).toBe(42)
    expect(store.cpuHistory).toHaveLength(1)
    expect(store.cpuHistory[0]).toEqual({ t: 1000, v: 42 })
  })

  it('updateField sets memory data and appends to history', () => {
    const store = useMetricsStore()
    store.updateField('memory', { usagePercent: 60, timestamp: 2000 })
    expect(store.memory.usagePercent).toBe(60)
    expect(store.memHistory).toHaveLength(1)
  })

  it('updateField sets gpu data and appends to history', () => {
    const store = useMetricsStore()
    store.updateField('gpu', { gpus: [{ utilization: 80 }], timestamp: 3000 })
    expect(store.gpu.gpus[0].utilization).toBe(80)
    expect(store.gpuHistory).toHaveLength(1)
  })

  it('updateField sets viewers count', () => {
    const store = useMetricsStore()
    store.updateField('viewers', { count: 5 })
    expect(store.viewers).toBe(5)
  })

  it('updateField handles unknown fields gracefully', () => {
    const store = useMetricsStore()
    expect(() => store.updateField('nonexistent', { x: 1 })).not.toThrow()
  })

  it('cpuHistory caps at 60 entries', () => {
    const store = useMetricsStore()
    for (let i = 0; i < 70; i++) {
      store.updateField('cpu', { usage: i, timestamp: i })
    }
    expect(store.cpuHistory).toHaveLength(60)
    expect(store.cpuHistory[0].v).toBe(10)
    expect(store.cpuHistory[59].v).toBe(69)
  })

  it('fetchField calls API and updates store', async () => {
    const store = useMetricsStore()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ usage: 75, timestamp: 5000 })
    })
    await store.fetchField('cpu')
    expect(store.cpu.usage).toBe(75)
    expect(store.loading.cpu).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/status/api/metrics/cpu')
  })

  it('fetchField handles errors gracefully', async () => {
    const store = useMetricsStore()
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    await store.fetchField('cpu')
    expect(store.loading.cpu).toBe(false)
  })

  it('refreshField calls refresh API', async () => {
    const store = useMetricsStore()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ usage: 99, timestamp: 6000 })
    })
    await store.refreshField('cpu')
    expect(store.cpu.usage).toBe(99)
    expect(mockFetch).toHaveBeenCalledWith('/status/api/refresh/cpu')
  })

  it('refreshField handles errors gracefully', async () => {
    const store = useMetricsStore()
    mockFetch.mockRejectedValueOnce(new Error('fail'))
    await store.refreshField('cpu')
    expect(store.loading.cpu).toBe(false)
  })
})

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })

  it('initializes with default intervals', () => {
    const store = useSettingsStore()
    expect(store.intervals.cpu).toBe(2)
    expect(store.intervals.memory).toBe(5)
    expect(store.targets).toHaveLength(1)
    expect(store.activeTarget).toBe(0)
  })

  it('load fetches settings from API', async () => {
    const store = useSettingsStore()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        intervals: { cpu: 10, memory: 15 },
        targets: [{ name: 'Remote', url: 'http://x' }],
        activeTarget: 0
      })
    })
    await store.load()
    expect(store.intervals.cpu).toBe(10)
    expect(store.targets[0].name).toBe('Remote')
  })

  it('load handles errors gracefully', async () => {
    const store = useSettingsStore()
    mockFetch.mockRejectedValueOnce(new Error('fail'))
    await store.load()
    expect(store.intervals.cpu).toBe(2) // unchanged
  })

  it('save sends PUT request', async () => {
    const store = useSettingsStore()
    mockFetch.mockResolvedValueOnce({ ok: true })
    const result = await store.save()
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/status/api/settings', expect.objectContaining({
      method: 'PUT'
    }))
    expect(store.saving).toBe(false)
  })

  it('save returns false on error', async () => {
    const store = useSettingsStore()
    mockFetch.mockRejectedValueOnce(new Error('fail'))
    const result = await store.save()
    expect(result).toBe(false)
    expect(store.saving).toBe(false)
  })

  it('addTarget appends target', () => {
    const store = useSettingsStore()
    store.addTarget('Arch', 'http://arch:3001')
    expect(store.targets).toHaveLength(2)
    expect(store.targets[1].name).toBe('Arch')
  })

  it('removeTarget removes non-zero index', () => {
    const store = useSettingsStore()
    store.addTarget('X', 'http://x')
    store.removeTarget(1)
    expect(store.targets).toHaveLength(1)
  })

  it('removeTarget cannot remove index 0', () => {
    const store = useSettingsStore()
    store.removeTarget(0)
    expect(store.targets).toHaveLength(1) // Local stays
  })

  it('removeTarget resets activeTarget if out of bounds', () => {
    const store = useSettingsStore()
    store.addTarget('X', 'http://x')
    store.activeTarget = 1
    store.removeTarget(1)
    expect(store.activeTarget).toBe(0)
  })

  it('testConnection succeeds', async () => {
    const store = useSettingsStore()
    mockFetch.mockResolvedValueOnce({ ok: true })
    await store.testConnection('http://example.com')
    expect(store.testResult).toBe('success')
    expect(store.testing).toBe(false)
  })

  it('testConnection fails', async () => {
    const store = useSettingsStore()
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    await store.testConnection('http://bad')
    expect(store.testResult).toBe('failed')
    expect(store.testing).toBe(false)
  })
})
