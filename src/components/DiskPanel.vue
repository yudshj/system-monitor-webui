<script setup>
import { onMounted, ref } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'
import { useI18n } from '../i18n/index.js'

const metrics = useMetricsStore()
const { t } = useI18n()
const expandedDevices = ref({})
const showRawSmart = ref({})
const copiedField = ref(null)

onMounted(() => {
  if (!metrics.disk) metrics.fetchField('disk')
  if (!metrics.smart) metrics.fetchField('smart')
})

function fmtBytes(b) {
  if (!b) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let v = b
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(1)} ${units[i]}`
}

function usageColor(pct) {
  if (pct < 70) return '#34d399'
  if (pct < 90) return '#fbbf24'
  return '#f87171'
}

function toggleDevice(dev) { expandedDevices.value = { ...expandedDevices.value, [dev]: !expandedDevices.value[dev] } }
function toggleRaw(dev) { showRawSmart.value = { ...showRawSmart.value, [dev]: !showRawSmart.value[dev] } }

async function copyRaw(text, key) {
  await navigator.clipboard.writeText(text)
  copiedField.value = key
  setTimeout(() => copiedField.value = null, 2000)
}
</script>

<template>
  <div class="panel-grid single">
    <div class="card wide">
      <div class="card-header">
        <h2>💾 {{ t('disk.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.disk || metrics.loading.smart }"
                @click="() => { metrics.refreshField('disk'); metrics.refreshField('smart') }" :title="t('common.refresh')">↻</button>
      </div>
      <div class="section" v-if="metrics.disk?.filesystems?.length">
        <h3>{{ t('disk.filesystems') }}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ t('disk.mount') }}</th><th>{{ t('disk.type') }}</th><th>{{ t('disk.size') }}</th><th>{{ t('disk.used') }}</th><th>{{ t('disk.available') }}</th><th>{{ t('disk.usePercent') }}</th></tr></thead>
            <tbody>
              <tr v-for="fs in metrics.disk.filesystems" :key="fs.mount">
                <td class="mono">{{ fs.mount }}</td>
                <td class="mono">{{ fs.type }}</td>
                <td class="mono">{{ fmtBytes(fs.size) }}</td>
                <td class="mono">{{ fmtBytes(fs.used) }}</td>
                <td class="mono">{{ fmtBytes(fs.available) }}</td>
                <td>
                  <div class="usage-cell">
                    <div class="progress-bar small"><div class="progress-fill" :style="{ width: fs.usePercent + '%', background: usageColor(fs.usePercent) }"></div></div>
                    <span class="mono">{{ fs.usePercent?.toFixed(1) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="section" v-if="metrics.smart?.devices?.length">
        <h3>{{ t('disk.smartHealth') }}</h3>
        <div class="smart-devices">
          <div class="smart-device-card" v-for="dev in metrics.smart.devices" :key="dev.device">
            <div class="smart-device-header" @click="toggleDevice(dev.device)">
              <div class="smart-device-info">
                <span class="smart-device-name mono">{{ dev.device }}</span>
                <span class="smart-device-model">{{ dev.model }}</span>
              </div>
              <div class="smart-device-badges">
                <span class="health-badge" :class="dev.health === 'PASSED' ? 'passed' : 'failed'">{{ dev.health }}</span>
                <span v-if="dev.temperature != null" class="temp-badge mono">{{ dev.temperature }}°C</span>
                <span v-if="dev.powerOnHours != null" class="hours-badge mono">{{ dev.powerOnHours?.toLocaleString() }}h</span>
                <span class="expand-arrow">{{ expandedDevices[dev.device] ? '▼' : '▶' }}</span>
              </div>
            </div>
            <div v-if="expandedDevices[dev.device]" class="smart-details">
              <div class="table-wrap" v-if="dev.attributes?.length">
                <table class="smart-table">
                  <thead><tr>
                    <th>{{ t('disk.smartAttr.id') }}</th><th>{{ t('disk.smartAttr.attribute') }}</th><th>{{ t('disk.smartAttr.value') }}</th>
                    <th>{{ t('disk.smartAttr.worst') }}</th><th>{{ t('disk.smartAttr.threshold') }}</th><th>{{ t('disk.smartAttr.raw') }}</th><th>{{ t('disk.smartAttr.status') }}</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="attr in dev.attributes" :key="attr.id" :class="{ 'attr-warning': attr.status === 'warning' }">
                      <td class="mono">{{ attr.id }}</td>
                      <td><span class="attr-name">{{ attr.name }}</span><div class="attr-explain">{{ attr.explanation }}</div></td>
                      <td class="mono">{{ attr.value }}</td><td class="mono">{{ attr.worst }}</td><td class="mono">{{ attr.threshold }}</td>
                      <td class="mono">{{ attr.rawValue }}</td><td><span class="status-dot" :class="attr.status"></span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="raw-smart-section">
                <button class="toggle-btn" @click="toggleRaw(dev.device)">
                  {{ showRawSmart[dev.device] ? '▼ ' + t('disk.hideRaw') : '▶ ' + t('disk.showRaw') }}
                </button>
                <div v-if="showRawSmart[dev.device]" class="raw-output">
                  <button class="copy-btn" @click="copyRaw(dev.raw, dev.device)">{{ copiedField === dev.device ? '✅ ' + t('common.copied') : '📋 ' + t('common.copy') }}</button>
                  <pre class="mono">{{ dev.raw }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-placeholder" v-if="!metrics.disk">{{ t('disk.loading') }}</div>
    </div>
  </div>
</template>
