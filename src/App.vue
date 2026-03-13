<script setup>
import { ref, onMounted } from 'vue'
import { useSSE } from './composables/useSSE.js'
import { useSettingsStore } from './stores/settings.js'
import { useI18n } from './i18n/index.js'
import AppHeader from './components/AppHeader.vue'
import CpuMemoryPanel from './components/CpuMemoryPanel.vue'
import GpuPanel from './components/GpuPanel.vue'
import NetworkPanel from './components/NetworkPanel.vue'
import DiskPanel from './components/DiskPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const activeTab = ref('cpu')
const { connected } = useSSE()
const settingsStore = useSettingsStore()
const { t } = useI18n()

onMounted(async () => {
  await settingsStore.load()
})

const tabs = [
  { id: 'cpu', icon: '🖥️', labelKey: 'tabs.cpu' },
  { id: 'gpu', icon: '🎮', labelKey: 'tabs.gpu' },
  { id: 'network', icon: '🌐', labelKey: 'tabs.network' },
  { id: 'disk', icon: '💾', labelKey: 'tabs.disk' },
  { id: 'settings', icon: '⚙️', labelKey: 'tabs.settings' }
]
</script>

<template>
  <div class="app">
    <AppHeader
      :tabs="tabs"
      :activeTab="activeTab"
      :connected="connected"
      @update:activeTab="activeTab = $event"
    />
    <main class="main-content">
      <Transition name="fade" mode="out-in">
        <CpuMemoryPanel v-if="activeTab === 'cpu'" />
        <GpuPanel v-else-if="activeTab === 'gpu'" />
        <NetworkPanel v-else-if="activeTab === 'network'" />
        <DiskPanel v-else-if="activeTab === 'disk'" />
        <SettingsPanel v-else-if="activeTab === 'settings'" />
      </Transition>
    </main>
  </div>
</template>
