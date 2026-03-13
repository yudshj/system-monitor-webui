import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

// We'll test the SSE logic by extracting it from the composable
// Since useSSE uses onMounted/onUnmounted which require a component context,
// we test the core logic directly

vi.stubGlobal('fetch', vi.fn())

import { useMetricsStore } from '../../src/stores/metrics.js'

describe('useSSE composable logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('metrics store updateField works for SSE-like events', () => {
    const store = useMetricsStore()

    // Simulate SSE event data
    store.updateField('cpu', { usage: 42, timestamp: 1000 })
    expect(store.cpu.usage).toBe(42)

    store.updateField('memory', { usagePercent: 60, timestamp: 2000 })
    expect(store.memory.usagePercent).toBe(60)

    store.updateField('viewers', { count: 3 })
    expect(store.viewers).toBe(3)

    store.updateField('network', { interfaces: [] })
    expect(store.network).toEqual({ interfaces: [] })

    store.updateField('disk', { filesystems: [] })
    expect(store.disk).toEqual({ filesystems: [] })

    store.updateField('smart', { devices: [] })
    expect(store.smart).toEqual({ devices: [] })

    store.updateField('fans', { fans: [] })
    expect(store.fans).toEqual({ fans: [] })

    store.updateField('ip', { publicIPv4: '1.2.3.4' })
    expect(store.ip.publicIPv4).toBe('1.2.3.4')
  })

  it('useSSE module exports a function', async () => {
    const mod = await import('../../src/composables/useSSE.js')
    expect(typeof mod.useSSE).toBe('function')
  })
})
