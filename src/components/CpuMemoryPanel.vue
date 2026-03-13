<script setup>
import { computed, onMounted } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const metrics = useMetricsStore()

onMounted(() => {
  if (!metrics.cpu) metrics.fetchField('cpu')
  if (!metrics.memory) metrics.fetchField('memory')
})

function tempColor(t) {
  if (t == null) return '#94a3b8'
  if (t < 60) return '#34d399'
  if (t < 80) return '#fbbf24'
  return '#f87171'
}

function fmtBytes(b) {
  if (!b) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = b
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

const cpuChartData = computed(() => ({
  labels: metrics.cpuHistory.map((_, i) => i),
  datasets: [{
    data: metrics.cpuHistory.map(h => h.v),
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96,165,250,0.15)',
    fill: true,
    borderWidth: 2
  }]
}))

const memChartData = computed(() => ({
  labels: metrics.memHistory.map((_, i) => i),
  datasets: [{
    data: metrics.memHistory.map(h => h.v),
    borderColor: '#34d399',
    backgroundColor: 'rgba(52,211,153,0.15)',
    fill: true,
    borderWidth: 2
  }]
}))
</script>

<template>
  <div class="panel-grid">
    <!-- CPU Section -->
    <div class="card">
      <div class="card-header">
        <h2>🖥️ CPU Usage</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.cpu }" @click="metrics.refreshField('cpu')" title="Refresh">↻</button>
      </div>
      <div class="stat-row" v-if="metrics.cpu">
        <div class="stat-big">
          <span class="stat-value mono">{{ metrics.cpu.usage?.toFixed(1) }}%</span>
          <span class="stat-label">Overall</span>
        </div>
      </div>
      <div class="chart-container" v-if="cpuChartData.datasets[0].data.length > 1">
        <Line :data="cpuChartData" :options="chartOpts" />
      </div>

      <!-- Per-core -->
      <div class="core-grid" v-if="metrics.cpu?.cores?.length">
        <div class="core-bar" v-for="core in metrics.cpu.cores" :key="core.core">
          <span class="core-label mono">C{{ core.core }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: core.load + '%', background: core.load > 80 ? '#f87171' : '#60a5fa' }"></div>
          </div>
          <span class="core-pct mono">{{ core.load.toFixed(0) }}%</span>
        </div>
      </div>

      <!-- Temperature -->
      <div class="temp-section" v-if="metrics.cpu?.temperature">
        <h3>Temperature</h3>
        <div class="temp-grid">
          <div class="temp-chip" v-if="metrics.cpu.temperature.main != null">
            <span class="temp-label">Package</span>
            <span class="temp-val mono" :style="{ color: tempColor(metrics.cpu.temperature.main) }">
              {{ metrics.cpu.temperature.main }}°C
            </span>
          </div>
          <div class="temp-chip" v-for="(t, i) in (metrics.cpu.temperature.cores || [])" :key="i">
            <span class="temp-label">Core {{ i }}</span>
            <span class="temp-val mono" :style="{ color: tempColor(t) }">{{ t != null ? t + '°C' : 'N/A' }}</span>
          </div>
        </div>
      </div>
      <div class="card-placeholder" v-if="!metrics.cpu">Loading CPU data…</div>
    </div>

    <!-- Memory Section -->
    <div class="card">
      <div class="card-header">
        <h2>🧠 Memory</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.memory }" @click="metrics.refreshField('memory')" title="Refresh">↻</button>
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

        <!-- Swap -->
        <div class="swap-section" v-if="metrics.memory.swap?.total > 0">
          <h3>Swap</h3>
          <div class="stat-row">
            <span class="mono">{{ fmtBytes(metrics.memory.swap.used) }} / {{ fmtBytes(metrics.memory.swap.total) }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (metrics.memory.swap.used / metrics.memory.swap.total * 100) + '%', background: '#a78bfa' }"></div>
          </div>
        </div>
      </div>
      <div class="card-placeholder" v-else>Loading Memory data…</div>
    </div>

    <!-- Fans -->
    <div class="card" v-if="metrics.fans?.fans?.length">
      <div class="card-header">
        <h2>🌀 Fans</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.fans }" @click="metrics.refreshField('fans')" title="Refresh">↻</button>
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
