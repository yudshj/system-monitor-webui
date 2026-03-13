<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings.js'

const settings = useSettingsStore()
const saveResult = ref(null)
const newTargetName = ref('')
const newTargetUrl = ref('')

onMounted(() => settings.load())

const intervalFields = [
  { key: 'cpu', label: 'CPU', min: 1, icon: '🖥️' },
  { key: 'memory', label: 'Memory', min: 1, icon: '🧠' },
  { key: 'gpu', label: 'GPU', min: 1, icon: '🎮' },
  { key: 'network', label: 'Network', min: 5, icon: '🌐' },
  { key: 'disk', label: 'Disk', min: 10, icon: '💾' },
  { key: 'smart', label: 'SMART', min: 30, icon: '🔍' },
  { key: 'fans', label: 'Fans', min: 2, icon: '🌀' }
]

async function handleSave() {
  const ok = await settings.save()
  saveResult.value = ok ? 'success' : 'error'
  setTimeout(() => saveResult.value = null, 3000)
}

function addTarget() {
  if (newTargetName.value && newTargetUrl.value) {
    settings.addTarget(newTargetName.value, newTargetUrl.value)
    newTargetName.value = ''
    newTargetUrl.value = ''
  }
}
</script>

<template>
  <div class="panel-grid single">
    <div class="card wide">
      <div class="card-header">
        <h2>⚙️ Settings</h2>
      </div>

      <!-- Refresh Intervals -->
      <div class="section">
        <h3>Refresh Intervals</h3>
        <div class="settings-grid">
          <div class="setting-row" v-for="field in intervalFields" :key="field.key">
            <label class="setting-label">
              <span>{{ field.icon }} {{ field.label }}</span>
            </label>
            <div class="setting-input">
              <input
                type="number"
                class="mono"
                :min="field.min"
                v-model.number="settings.intervals[field.key]"
              />
              <span class="input-unit">sec</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Remote Targets -->
      <div class="section">
        <h3>Remote API Targets</h3>
        <div class="targets-list">
          <div class="target-item" v-for="(target, i) in settings.targets" :key="i"
               :class="{ active: settings.activeTarget === i }">
            <div class="target-info">
              <input type="radio" :value="i" v-model="settings.activeTarget" :id="'target-' + i" />
              <label :for="'target-' + i">
                <span class="target-name">{{ target.name }}</span>
                <span class="target-url mono">{{ target.url || '(local)' }}</span>
              </label>
            </div>
            <div class="target-actions">
              <button v-if="target.url" class="btn-sm"
                      :disabled="settings.testing"
                      @click="settings.testConnection(target.url)">
                {{ settings.testing ? '…' : '🔗 Test' }}
              </button>
              <button v-if="i > 0" class="btn-sm danger" @click="settings.removeTarget(i)">✕</button>
            </div>
          </div>
        </div>

        <div class="test-result" v-if="settings.testResult">
          <span :class="settings.testResult">
            {{ settings.testResult === 'success' ? '✅ Connection OK' : '❌ Connection failed' }}
          </span>
        </div>

        <!-- Add Target -->
        <div class="add-target">
          <input v-model="newTargetName" placeholder="Name" class="input-field" />
          <input v-model="newTargetUrl" placeholder="https://host:port" class="input-field mono" />
          <button class="btn-sm primary" @click="addTarget" :disabled="!newTargetName || !newTargetUrl">+ Add</button>
        </div>
      </div>

      <!-- Save Button -->
      <div class="section save-section">
        <button class="btn-primary" @click="handleSave" :disabled="settings.saving">
          {{ settings.saving ? 'Saving…' : '💾 Save Settings' }}
        </button>
        <Transition name="fade">
          <span v-if="saveResult" class="save-toast" :class="saveResult">
            {{ saveResult === 'success' ? '✅ Settings saved!' : '❌ Failed to save' }}
          </span>
        </Transition>
      </div>
    </div>
  </div>
</template>
