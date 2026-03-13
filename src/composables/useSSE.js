import { ref, onMounted, onUnmounted } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'
import { apiUrl } from '../utils/token.js'

export function useSSE() {
  const connected = ref(false)
  let eventSource = null
  let retryTimeout = null
  let retryDelay = 1000
  const MAX_RETRY = 30000

  function connect() {
    if (eventSource) {
      eventSource.close()
    }

    const metrics = useMetricsStore()
    eventSource = new EventSource(apiUrl('/status/api/stream'))

    eventSource.onopen = () => {
      connected.value = true
      retryDelay = 1000
    }

    // Listen for each metric event type
    const fields = ['cpu', 'memory', 'gpu', 'network', 'ip', 'disk', 'smart', 'fans', 'temperature', 'viewers']
    for (const field of fields) {
      eventSource.addEventListener(field, (e) => {
        try {
          const data = JSON.parse(e.data)
          metrics.updateField(field, data)
        } catch { /* ignore parse errors */ }
      })
    }

    eventSource.onerror = () => {
      connected.value = false
      eventSource.close()
      eventSource = null
      // Exponential backoff retry
      retryTimeout = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY)
        connect()
      }, retryDelay)
    }
  }

  function disconnect() {
    if (retryTimeout) clearTimeout(retryTimeout)
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connected.value = false
  }

  onMounted(() => connect())
  onUnmounted(() => disconnect())

  return { connected, connect, disconnect }
}
