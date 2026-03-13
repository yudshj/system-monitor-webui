<script setup>
import { useMetricsStore } from '../stores/metrics.js'
import { useI18n } from '../i18n/index.js'

const props = defineProps({
  tabs: Array,
  activeTab: String,
  connected: Boolean
})
const emit = defineEmits(['update:activeTab'])
const metrics = useMetricsStore()
const { t } = useI18n()
</script>

<template>
  <header class="app-header">
    <div class="header-top">
      <div class="header-brand">
        <svg class="brand-icon" viewBox="0 0 24 24" width="28" height="28">
          <path d="M3 17l4-8 4 6 4-12 4 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="19" cy="11" r="2" fill="#34d399"/>
        </svg>
        <h1 class="brand-title">{{ t('app.title') }}</h1>
      </div>
      <div class="header-status">
        <span class="viewer-badge" v-if="metrics.viewers > 0">
          👁️ {{ metrics.viewers }} {{ t('app.viewers') }}
        </span>
        <span class="connection-dot" :class="connected ? 'connected' : 'disconnected'"
              :title="connected ? t('app.connected') : t('app.disconnected')"></span>
      </div>
    </div>
    <nav class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="emit('update:activeTab', tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ t(tab.labelKey) }}</span>
      </button>
    </nav>
  </header>
</template>
