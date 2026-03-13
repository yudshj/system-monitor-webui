<script setup>
import { onMounted, ref, computed } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'
import { useI18n } from '../i18n/index.js'
import { Gpu, RotateCw, Copy, Check } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const metrics = useMetricsStore()
const { t } = useI18n()
const showRaw = ref(false)
const copySuccess = ref(false)

onMounted(() => { if (!metrics.gpu) metrics.fetchField('gpu') })

function tempColor(v) {
  if (v < 60) return '#34d399'
  if (v < 80) return '#fbbf24'
  return '#f87171'
}

async function copyRaw() {
  if (metrics.gpu?.raw) {
    await navigator.clipboard.writeText(metrics.gpu.raw)
    copySuccess.value = true
    setTimeout(() => copySuccess.value = false, 2000)
  }
}

const chartOpts = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
  scales: { x: { display: false }, y: { min: 0, max: 100, ticks: { color: '#94a3b8', callback: v => v + '%' }, grid: { color: 'rgba(148,163,184,0.1)' } } },
  plugins: { tooltip: { enabled: true }, legend: { display: false } },
  elements: { point: { radius: 0 }, line: { tension: 0.4 } }
}

const gpuChartData = computed(() => ({
  labels: metrics.gpuHistory.map((_, i) => i),
  datasets: [{
    data: metrics.gpuHistory.map(h => h.v),
    borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.15)',
    fill: true, borderWidth: 2
  }]
}))
</script>

<template>
  <div class="panel-grid single">
    <div class="card wide">
      <div class="card-header">
        <h2><Gpu :size="18" style="vertical-align: -3px; margin-right: 6px;" />{{ t('gpu.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.gpu }" @click="metrics.refreshField('gpu')" :title="t('common.refresh')"><RotateCw :size="14" /></button>
      </div>
      <div v-if="metrics.gpu?.available === false" class="card-placeholder">{{ t('gpu.notAvailable') }}</div>
      <div v-else-if="metrics.gpu?.gpus?.length">
        <div v-for="(g, i) in metrics.gpu.gpus" :key="i" class="gpu-card">
          <div class="gpu-info-row">
            <div class="info-chip"><span class="info-label">{{ t('gpu.name') }}</span><span class="mono">{{ g.name }}</span></div>
            <div class="info-chip"><span class="info-label">{{ t('gpu.driver') }}</span><span class="mono">{{ g.driverVersion }}</span></div>
            <div class="info-chip" v-if="metrics.gpu.cudaVersion"><span class="info-label">{{ t('gpu.cuda') }}</span><span class="mono">{{ metrics.gpu.cudaVersion }}</span></div>
          </div>
          <div class="gpu-metrics">
            <div class="metric-block">
              <span class="metric-label">{{ t('gpu.utilization') }}</span>
              <span class="stat-value mono">{{ g.utilization }}%</span>
              <div class="progress-bar"><div class="progress-fill" :style="{ width: g.utilization + '%', background: '#a78bfa' }"></div></div>
            </div>
            <div class="metric-block">
              <span class="metric-label">{{ t('gpu.vram') }}</span>
              <span class="stat-value mono">{{ g.memoryUsed }} / {{ g.memoryTotal }} MB</span>
              <div class="progress-bar"><div class="progress-fill" :style="{ width: (g.memoryUsed/g.memoryTotal*100) + '%', background: '#60a5fa' }"></div></div>
            </div>
            <div class="metric-block">
              <span class="metric-label">{{ t('gpu.temp') }}</span>
              <span class="stat-value mono" :style="{ color: tempColor(g.temperature) }">{{ g.temperature }}°C</span>
            </div>
            <div class="metric-block">
              <span class="metric-label">{{ t('gpu.power') }}</span>
              <span class="stat-value mono">{{ g.powerDraw }}W / {{ g.powerLimit }}W</span>
              <div class="progress-bar"><div class="progress-fill" :style="{ width: (g.powerDraw/g.powerLimit*100) + '%', background: '#fbbf24' }"></div></div>
            </div>
          </div>
        </div>
        <div class="chart-container" v-if="gpuChartData.datasets[0].data.length > 1">
          <h3>{{ t('gpu.utilizationHistory') }}</h3>
          <Line :data="gpuChartData" :options="chartOpts" />
        </div>
        <div class="section" v-if="metrics.gpu.processes?.length">
          <h3>{{ t('gpu.processes') }}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>{{ t('gpu.pid') }}</th><th>{{ t('gpu.process') }}</th><th>{{ t('gpu.memoryMB') }}</th></tr></thead>
              <tbody>
                <tr v-for="p in metrics.gpu.processes" :key="p.pid">
                  <td class="mono">{{ p.pid }}</td><td class="mono">{{ p.name }}</td><td class="mono">{{ p.memoryMB }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="section">
          <button class="toggle-btn" @click="showRaw = !showRaw">
            {{ showRaw ? '▼ ' + t('gpu.hideRaw') : '▶ ' + t('gpu.showRaw') }}
          </button>
          <div v-if="showRaw" class="raw-output">
            <button class="copy-btn" @click="copyRaw">
              <Check v-if="copySuccess" :size="14" style="vertical-align: -2px; margin-right: 4px;" />
              <Copy v-else :size="14" style="vertical-align: -2px; margin-right: 4px;" />
              {{ copySuccess ? t('common.copied') : t('common.copy') }}
            </button>
            <pre class="mono">{{ metrics.gpu.raw }}</pre>
          </div>
        </div>
      </div>
      <div v-else class="card-placeholder">{{ t('gpu.loading') }}</div>
    </div>
  </div>
</template>
