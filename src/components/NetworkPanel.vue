<script setup>
import { onMounted, ref } from 'vue'
import { useMetricsStore } from '../stores/metrics.js'
import { useI18n } from '../i18n/index.js'
import { Globe, RotateCw, Copy, Check } from 'lucide-vue-next'

const metrics = useMetricsStore()
const { t } = useI18n()
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
        <h2><Globe :size="18" style="vertical-align: -3px; margin-right: 6px;" />{{ t('network.title') }}</h2>
        <button class="refresh-btn" :class="{ spinning: metrics.loading.network || metrics.loading.ip }"
                @click="() => { metrics.refreshField('network'); metrics.refreshField('ip') }" :title="t('common.refresh')"><RotateCw :size="14" /></button>
      </div>
      <div class="section" v-if="metrics.ip">
        <h3>{{ t('network.ipAddresses') }}</h3>
        <div class="ip-grid">
          <div class="ip-card" v-if="metrics.ip.publicIPv4">
            <span class="ip-label">{{ t('network.publicIpv4') }}</span>
            <div class="ip-value-row">
              <span class="mono">{{ metrics.ip.publicIPv4 }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.publicIPv4, 'ipv4')">
                <Check v-if="copiedField === 'ipv4'" :size="14" />
                <Copy v-else :size="14" />
              </button>
            </div>
          </div>
          <div class="ip-card" v-if="metrics.ip.publicIPv6">
            <span class="ip-label">{{ t('network.publicIpv6') }}</span>
            <div class="ip-value-row">
              <span class="mono ip-v6">{{ metrics.ip.publicIPv6 }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.publicIPv6, 'ipv6')">
                <Check v-if="copiedField === 'ipv6'" :size="14" />
                <Copy v-else :size="14" />
              </button>
            </div>
          </div>
          <div class="ip-card" v-if="metrics.ip.tailscale?.ip">
            <span class="ip-label">{{ t('network.tailscaleIp') }}</span>
            <div class="ip-value-row">
              <span class="mono">{{ metrics.ip.tailscale.ip }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.tailscale.ip, 'tsip')">
                <Check v-if="copiedField === 'tsip'" :size="14" />
                <Copy v-else :size="14" />
              </button>
            </div>
          </div>
          <div class="ip-card" v-if="metrics.ip.tailscale?.hostname">
            <span class="ip-label">{{ t('network.tailscaleHostname') }}</span>
            <div class="ip-value-row">
              <span class="mono">{{ metrics.ip.tailscale.hostname }}</span>
              <button class="copy-btn-sm" @click="copyText(metrics.ip.tailscale.hostname, 'tshost')">
                <Check v-if="copiedField === 'tshost'" :size="14" />
                <Copy v-else :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="section" v-if="metrics.network?.interfaces?.length">
        <h3>{{ t('network.interfaces') }}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ t('network.name') }}</th><th>{{ t('network.ipv4') }}</th><th>{{ t('network.ipv6') }}</th><th>{{ t('network.speed') }}</th><th>{{ t('network.state') }}</th></tr></thead>
            <tbody>
              <tr v-for="iface in metrics.network.interfaces" :key="iface.name">
                <td class="mono">{{ iface.name }}</td>
                <td class="mono">{{ iface.ip4 || '—' }}</td>
                <td class="mono ip-v6">{{ iface.ip6 || '—' }}</td>
                <td class="mono">{{ iface.speed ? iface.speed + ' Mbps' : '—' }}</td>
                <td><span class="status-badge" :class="iface.state === 'up' ? 'up' : 'down'">{{ iface.state || 'unknown' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-placeholder" v-if="!metrics.network && !metrics.ip">{{ t('network.loading') }}</div>
    </div>
  </div>
</template>
