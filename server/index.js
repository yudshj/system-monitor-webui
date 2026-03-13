import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRoutes, broadcastSSE } from './routes.js'
import { COLLECTORS } from './collectors.js'
import { loadSettings } from './settings.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const DIST_DIR = join(__dirname, '..', 'dist')

export function createApp() {
  const app = express()
  app.use(express.json())

  // Shared state
  const state = {
    cache: {},
    sseClients: new Map(),
    intervals: {},
    onSettingsChange: null,
    onViewerJoin: null,
    onViewerLeave: null
  }

  // --- Collection interval management ---
  function startIntervals() {
    const settings = loadSettings()
    stopIntervals()

    for (const [field, collector] of Object.entries(COLLECTORS)) {
      const intervalSec = settings.intervals[field] || 10
      state.intervals[field] = setInterval(async () => {
        if (state.sseClients.size === 0) return
        try {
          const data = await collector()
          state.cache[field] = data
          broadcastSSE(state, field, data)
        } catch { /* silently skip failed collections */ }
      }, intervalSec * 1000)
    }
  }

  function stopIntervals() {
    for (const [field, interval] of Object.entries(state.intervals)) {
      clearInterval(interval)
      delete state.intervals[field]
    }
  }

  state.onSettingsChange = () => {
    if (state.sseClients.size > 0) startIntervals()
  }
  state.onViewerJoin = () => startIntervals()
  state.onViewerLeave = () => stopIntervals()

  // API routes at /status/api
  app.use('/status/api', createRoutes(state))

  // Serve built frontend at /status/
  app.use('/status', express.static(DIST_DIR))
  app.get('/status', (req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
  // Handle SPA routes (Express 5 syntax)
  app.get('/status/{*path}', (req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })

  // Redirect root to /status/
  app.get('/', (req, res) => res.redirect('/status/'))

  return { app, state, startIntervals, stopIntervals }
}

// Start server if run directly
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMainModule) {
  const { app } = createApp()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Status Monitor running on http://0.0.0.0:${PORT}/status/`)
  })
}
