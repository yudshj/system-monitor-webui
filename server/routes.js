import { Router } from 'express'
import { COLLECTORS } from './collectors.js'
import { loadSettings, saveSettings } from './settings.js'

/**
 * Create Express router with all API routes.
 * @param {object} state - Shared server state { cache, viewers, intervals, sseClients }
 */
export function createRoutes(state) {
  const router = Router()

  // --- Metrics endpoints ---
  router.get('/metrics/:field', async (req, res) => {
    const field = req.params.field
    if (!COLLECTORS[field]) {
      return res.status(404).json({ error: `Unknown field: ${field}` })
    }
    // Return cached data if available
    if (state.cache[field]) {
      return res.json(state.cache[field])
    }
    // Otherwise collect fresh
    try {
      const data = await COLLECTORS[field]()
      state.cache[field] = data
      return res.json(data)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  })

  // --- SMART for specific device ---
  router.get('/metrics/smart/:device', async (req, res) => {
    try {
      const device = `/dev/${req.params.device}`
      const data = await COLLECTORS.smart(device)
      if (!data) return res.status(404).json({ error: 'Device not found or SMART not available' })
      return res.json(data)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  })

  // --- Manual refresh ---
  router.get('/refresh/:field', async (req, res) => {
    const field = req.params.field
    if (!COLLECTORS[field]) {
      return res.status(404).json({ error: `Unknown field: ${field}` })
    }
    try {
      const data = await COLLECTORS[field]()
      state.cache[field] = data
      // Broadcast to SSE clients
      broadcastSSE(state, field, data)
      return res.json(data)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  })

  // --- Settings ---
  router.get('/settings', (req, res) => {
    res.json(loadSettings())
  })

  router.put('/settings', (req, res) => {
    try {
      const settings = req.body
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings' })
      }
      const saved = saveSettings(settings)
      // Restart intervals with new settings
      if (state.onSettingsChange) state.onSettingsChange(saved)
      return res.json(saved)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  })

  // --- Viewers ---
  router.get('/viewers', (req, res) => {
    res.json({ count: state.sseClients.size })
  })

  // --- SSE stream ---
  router.get('/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    })
    res.write('\n') // initial flush

    const clientId = Symbol()
    state.sseClients.set(clientId, res)

    // Notify viewers change
    broadcastViewerCount(state)

    // If this is the first viewer, start collection
    if (state.sseClients.size === 1 && state.onViewerJoin) {
      state.onViewerJoin()
    }

    // Send cached data immediately
    for (const [field, data] of Object.entries(state.cache)) {
      res.write(`event: ${field}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    req.on('close', () => {
      state.sseClients.delete(clientId)
      broadcastViewerCount(state)
      if (state.sseClients.size === 0 && state.onViewerLeave) {
        state.onViewerLeave()
      }
    })
  })

  return router
}

/** Broadcast a metric event to all SSE clients */
export function broadcastSSE(state, event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const [, res] of state.sseClients) {
    res.write(msg)
  }
}

/** Broadcast viewer count to all SSE clients */
function broadcastViewerCount(state) {
  broadcastSSE(state, 'viewers', { count: state.sseClients.size })
}
