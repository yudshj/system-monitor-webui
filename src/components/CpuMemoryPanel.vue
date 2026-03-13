<script setup>
import { computed, onMounted } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'
import { useI18n } from '../i18n/index.js'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const metrics = useMetricsStore()
const { t } = useI18n()

onMounted(() => {
  if (!metrics.cpu) metrics.fetchField('cpu')
  if (!metrics.memory) metrics.fetchField('memory')
  if (!metrics.temperature) metrics.fetchField('temperature')
})

function tempColor(v) {
  if (v == null) return '#94a3b8'
  if (v < 60) return '#34d399'
  if (v < 80) return '#fbbf24'
  return '#f87171'
}

function fmtBytes(b) {
  if (!b) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let v = b
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(1)} ${units[i]}`
}

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  scales: {
    x: { display: false },
    y: { min: 0, max: 100, ticks: { color: '#94a3b8', callback: v => v + '%' }, grid: { color: 'rgba(148,163,184,0.1)' } }
  },
  plugins: { tooltip: { enabled: true }, legend: { display: false } },
  elements: { point: { radius: 0 }, line: { tension: 0.4 } }
}

const tempChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  scales: {
    x: { display: false },
    y: { min: 0, suggestedMax: 100, ticks: { color: '#94a3b8', callback: v => v + '°C' }, grid: { color: 'rgba(148,163,184,0.1)' } }
  },
  plugins: { tooltip: { enabled: true }, legend: { display: false } },
  elements: { point: { radius: 0 }, line: { tension: 0.4 } }
}

const cpuChartData = computed(() => ({
  labels: metrics.cpuHistory.map((_, i) => i),
  datasets: [{
    data: metrics.cpuHistory.map(h => h.v),
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96,165,250,0.15)',
    fill: true, borderWidth: 2
  }]
}))

const memChartData = computed(() => ({
  labels: metrics.memHistory.map((_, i) => i),
  datasets: [{
    data: metrics.memHistory.map(h => h.v),
    borderColor: '#34d399',
    backgroundColor: 'rgba(52,211,153,0.15)',
    fill: true, borderWidth: 2
  }]
}))

const tempChartData = computed(() => ({
  labels: metrics.tempHistory.map((_, i) => i),
  datasets: [{
    data: metrics.tempHistory.map(h => h.v),
    borderColor: '#f87171',
    backgroundColor: 'rgba(248,113,113,0.15)',
    fill: true, borderWidth: 2
  }]
}))

const cpuSensors = computed(() =>
  (metrics.temperature?.sensors || []).filter(s => s.type === 'cpu')
)
const gpuSensors = computed(() =>
  (metrics.temperature?.sensors || []).filter(s => s.type === 'gpu')
)
</script>

<template>
  <div class="panel-grid">
    <!-- CPU Section -->
    <div class="card">
      <div class="card-header">
        <h2>🖥️ {{ t('cpu.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.cpu }" @click="metrics.refreshField('cpu')" :title="t('common.refresh')">↻</button>
      </div>
      <div class="stat-row" v-if="metrics.cpu">
        <div class="stat-big">
          <span class="stat-value mono">{{ metrics.cpu.usage?.toFixed(1) }}%</span>
          <span class="stat-label">{{ t('cpu.overall') }}</span>
        </div>
      </div>
      <div class="chart-container" v-if="cpuChartData.datasets[0].data.length > 1">
        <Line :data="cpuChartData" :options="chartOpts" />
      </div>
      <div class="core-grid" v-if="metrics.cpu?.cores?.length">
        <div class="core-bar" v-for="core in metrics.cpu.cores" :key="core.core">
          <span class="core-label mono">C{{ core.core }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: core.load + '%', background: core.load > 80 ? '#f87171' : '#60a5fa' }"></div>
          </div>
          <span class="core-pct mono">{{ core.load.toFixed(0) }}%</span>
        </div>
      </div>
      <div class="card-placeholder" v-if="!metrics.cpu">{{ t('cpu.loading') }}</div>
    </div>

    <!-- Memory Section -->
    <div class="card">
      <div class="card-header">
        <h2>🧠 {{ t('memory.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.memory }" @click="metrics.refreshField('memory')" :title="t('common.refresh')">↻</button>
      </div>
      <div v-if="metrics.memory">
        <div class="stat-row">
          <div class="stat-big">
            <span class="stat-value mono">{{ metrics.memory.usagePercent?.toFixed(1) }}%</span>
            <span class="stat-label">{{ fmtBytes(metrics.memory.used) }} / {{ fmtBytes(metrics.memory.total) }}</span>
          </div>
        </div>
        <div class="progress-bar large">
          <div class="progress-fill" :style="{ width: metrics.memory.usagePercent + '%', background: metrics.memory.usagePercent > 90 ? '#f87171' : metrics.memory.usagePercent > 70 ? '#fbbf24' : '#34d399' }"></div>
        </div>
        <div class="chart-container" v-if="memChartData.datasets[0].data.length > 1">
          <Line :data="memChartData" :options="chartOpts" />
        </div>
        <div class="swap-section" v-if="metrics.memory.swap?.total > 0">
          <h3>{{ t('memory.swap') }}</h3>
          <div class="stat-row"><span class="mono">{{ fmtBytes(metrics.memory.swap.used) }} / {{ fmtBytes(metrics.memory.swap.total) }}</span></div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (metrics.memory.swap.used / metrics.memory.swap.total * 100) + '%', background: '#a78bfa' }"></div>
          </div>
        </div>
      </div>
      <div class="card-placeholder" v-else>{{ t('memory.loading') }}</div>
    </div>

    <!-- Temperature Section -->
    <div class="card wide">
      <div class="card-header">
        <h2>🌡️ {{ t('temperature.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.temperature }" @click="metrics.refreshField('temperature')" :title="t('common.refresh')">↻</button>
      </div>
      <div v-if="metrics.temperature?.sensors?.length">
        <div class="stat-row" v-if="metrics.temperature.max != null">
          <div class="stat-big">
            <span class="stat-value mono" :style="{ color: tempColor(metrics.temperature.max) }">{{ metrics.temperature.max }}°C</span>
            <span class="stat-label">{{ t('temperature.max') }}</span>
          </div>
        </div>
        <div class="chart-container" v-if="tempChartData.datasets[0].data.length > 1">
          <Line :data="tempChartData" :options="tempChartOpts" />
        </div>
        <div class="temp-groups">
          <div class="temp-group" v-if="cpuSensors.length">
            <h3>{{ t('temperature.cpu') }}</h3>
            <div class="temp-grid">
              <div class="temp-chip" v-for="s in cpuSensors" :key="s.name">
                <span class="temp-label">{{ s.name }}</span>
                <span class="temp-val mono" :style="{ color: tempColor(s.value) }">{{ s.value }}°C</span>
              </div>
            </div>
          </div>
          <div class="temp-group" v-if="gpuSensors.length">
            <h3>{{ t('temperature.gpu') }}</h3>
            <div class="temp-grid">
              <div class="temp-chip" v-for="s in gpuSensors" :key="s.name">
                <span class="temp-label">{{ s.name }}</span>
                <span class="temp-val mono" :style="{ color: tempColor(s.value) }">{{ s.value }}°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-placeholder" v-else-if="metrics.temperature">{{ t('temperature.noData') }}</div>
    </div>

    <!-- Fans -->
    <div class="card" v-if="metrics.fans?.fans?.length">
      <div class="card-header">
        <h2>🌀 {{ t('fans.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.fans }" @click="metrics.refreshField('fans')" :title="t('common.refresh')">↻</button>
      </div>
      <div class="fan-list">
        <div class="fan-item" v-for="fan in metrics.fans.fans" :key="fan.name">
          <span>{{ fan.name }}</span>
          <span class="mono">{{ fan.speed }} RPM</span>
        </div>
      </div>
    </div>
  </div>
</template>
