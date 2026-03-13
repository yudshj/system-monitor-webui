import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch } from '../utils/token.js'

const API = '/status/api'

export const useSettingsStore = defineStore('settings', () => {
  const intervals = ref({
    cpu: 2, memory: 5, gpu: 5, network: 60, disk: 30, smart: 300, fans: 10, temperature: 10
  })
  const locale = ref('zh')
  const targets = ref([{ name: 'Local', url: '' }])
  const activeTarget = ref(0)
  const saving = ref(false)
  const testing = ref(false)
  const testResult = ref(null)

  async function load() {
    try {
      const res = await apiFetch(`${API}/settings`)
      if (res.ok) {
        const data = await res.json()
        intervals.value = data.intervals || intervals.value
        targets.value = data.targets || targets.value
        activeTarget.value = data.activeTarget ?? 0
        if (data.locale) {
          locale.value = data.locale
          // Sync with i18n
          import('../i18n/index.js').then(m => m.setLocale(data.locale))
        }
      }
    } catch { /* ignore */ }
  }

  async function save() {
    saving.value = true
    try {
      const res = await apiFetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervals: intervals.value, targets: targets.value, activeTarget: activeTarget.value, locale: locale.value })
      })
      return res.ok
    } catch { return false }
    finally { saving.value = false }
  }

  function addTarget(name, url) {
    targets.value = [...targets.value, { name, url }]
  }

  function removeTarget(index) {
    if (index === 0) return // Can't remove Local
    targets.value = targets.value.filter((_, i) => i !== index)
    if (activeTarget.value >= targets.value.length) {
      activeTarget.value = 0
    }
  }

  async function testConnection(url) {
    testing.value = true
    testResult.value = null
    try {
      const res = await fetch(`${url}/status/api/viewers`, { signal: AbortSignal.timeout(5000) })
      testResult.value = res.ok ? 'success' : 'failed'
    } catch {
      testResult.value = 'failed'
    }
    finally { testing.value = false }
  }

  return { intervals, locale, targets, activeTarget, saving, testing, testResult, load, save, addTarget, removeTarget, testConnection }
})
