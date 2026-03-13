import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiFetch } from '../utils/token.js'

const API = '/status/api'
const HISTORY_MAX = 60

export const useMetricsStore = defineStore('metrics', () => {
  // Latest data
  const cpu = ref(null)
  const memory = ref(null)
  const gpu = ref(null)
  const network = ref(null)
  const ip = ref(null)
  const disk = ref(null)
  const smart = ref(null)
  const fans = ref(null)
  const viewers = ref(0)

  // Chart history
  const cpuHistory = ref([])
  const memHistory = ref([])
  const gpuHistory = ref([])

  // Loading state per field
  const loading = ref({})

  const fields = { cpu, memory, gpu, network, ip, disk, smart, fans }

  function updateField(field, data) {
    if (fields[field]) {
      fields[field].value = data
    }
    // Append to history
    if (field === 'cpu' && data) {
      cpuHistory.value = [...cpuHistory.value.slice(-(HISTORY_MAX - 1)), { t: data.timestamp, v: data.usage }]
    }
    if (field === 'memory' && data) {
      memHistory.value = [...memHistory.value.slice(-(HISTORY_MAX - 1)), { t: data.timestamp, v: data.usagePercent }]
    }
    if (field === 'gpu' && data?.gpus?.[0]) {
      gpuHistory.value = [...gpuHistory.value.slice(-(HISTORY_MAX - 1)), { t: data.timestamp, v: data.gpus[0].utilization }]
    }
    if (field === 'viewers') {
      viewers.value = data?.count || 0
    }
  }

  async function fetchField(field) {
    loading.value = { ...loading.value, [field]: true }
    try {
      const res = await apiFetch(`${API}/metrics/${field}`)
      if (res.ok) {
        const data = await res.json()
        updateField(field, data)
        return data
      }
    } catch { /* ignore */ }
    finally { loading.value = { ...loading.value, [field]: false } }
  }

  async function refreshField(field) {
    loading.value = { ...loading.value, [field]: true }
    try {
      const res = await apiFetch(`${API}/refresh/${field}`)
      if (res.ok) {
        const data = await res.json()
        updateField(field, data)
        return data
      }
    } catch { /* ignore */ }
    finally { loading.value = { ...loading.value, [field]: false } }
  }

  return {
    cpu, memory, gpu, network, ip, disk, smart, fans, viewers,
    cpuHistory, memHistory, gpuHistory,
    loading, updateField, fetchField, refreshField
  }
})
