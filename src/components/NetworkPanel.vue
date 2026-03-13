<script setup>
import { onMounted, ref } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'

const metrics = useMetricsStore()
const copiedField = ref(null)

onMounted(() => {
  if (!metrics.network) metrics.fetchField('network')
  if (!metrics.ip) metrics.fetchField('ip')
})

async function copyText(text, field) {
  await navigator.clipboard.writeText(text)
  copiedField.value = field
  setTimeout(() => copiedField.value = null, 2000)
}
</script>

<template>
  <div class="panel-grid single">
    <div class="card wide">
      <div class="card-header">
        <h2>🌐 Network</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.network || metrics.loading.ip }"
                @click="() => { metrics.refreshField('network'); metrics.refreshField('ip') }" title="Refresh">↻</button>
      </div>

      <!-- IP Addresses -->
      <div class="section" v-if="metrics.ip">
        <h3>IP Addresses</h3>
        <div class="ip-grid">
          <div class="ip-card" v-if="metrics.ip.publicIPv4">
            <span class="ip-label">Public IPv4</span>
            <div class="ip-value-row">
              <span class="mono">{{ metrics.ip.publicIPv4 }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.publicIPv4, 'ipv4')">
                {{ copiedField === 'ipv4' ? '✅' : '📋' }}
              </button>
            </div>
          </div>
          <div class="ip-card" v-if="metrics.ip.publicIPv6">
            <span class="ip-label">Public IPv6</span>
            <div class="ip-value-row">
              <span class="mono ip-v6">{{ metrics.ip.publicIPv6 }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.publicIPv6, 'ipv6')">
                {{ copiedField === 'ipv6' ? '✅' : '📋' }}
              </button>
            </div>
          </div>
          <div class="ip-card" v-if="metrics.ip.tailscale?.ip">
            <span class="ip-label">Tailscale IP</span>
            <div class="ip-value-row">
              <span class="mono">{{ metrics.ip.tailscale.ip }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.tailscale.ip, 'tsip')">
                {{ copiedField === 'tsip' ? '✅' : '📋' }}
              </button>
            </div>
          </div>
          <div class="ip-card" v-if="metrics.ip.tailscale?.hostname">
            <span class="ip-label">Tailscale Hostname</span>
            <div class="ip-value-row">
              <span class="mono">{{ metrics.ip.tailscale.hostname }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.tailscale.hostname, 'tshost')">
                {{ copiedField === 'tshost' ? '✅' : '📋' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Interfaces Table -->
      <div class="section" v-if="metrics.network?.interfaces?.length">
        <h3>Network Interfaces</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>IPv4</th><th>IPv6</th><th>Speed</th><th>State</th></tr>
            </thead>
            <tbody>
              <tr v-for="iface in metrics.network.interfaces" :key="iface.name">
                <td class="mono">{{ iface.name }}</td>
                <td class="mono">{{ iface.ip4 || '—' }}</td>
                <td class="mono ip-v6">{{ iface.ip6 || '—' }}</td>
                <td class="mono">{{ iface.speed ? iface.speed + ' Mbps' : '—' }}</td>
                <td>
                  <span class="status-badge" :class="iface.state === 'up' ? 'up' : 'down'">
                    {{ iface.state || 'unknown' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card-placeholder" v-if="!metrics.network && !metrics.ip">Loading Network data…</div>
    </div>
  </div>
</template>
