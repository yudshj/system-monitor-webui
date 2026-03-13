<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import { useI18n } from '../i18n/index.js'
import { Settings, Monitor, MemoryStick, Gpu, Thermometer, Globe, HardDrive, Search, Fan, Save, Link, Check, X } from 'lucide-vue-next'

const settings = useSettingsStore()
const { t, locale, setLocale } = useI18n()
const saveResult = ref(null)
const newTargetName = ref('')
const newTargetUrl = ref('')

onMounted(() => settings.load())

const intervalFields = [
  { key: 'cpu', min: 1, icon: Monitor },
  { key: 'memory', min: 1, icon: MemoryStick },
  { key: 'gpu', min: 1, icon: Gpu },
  { key: 'temperature', min: 2, icon: Thermometer },
  { key: 'network', min: 5, icon: Globe },
  { key: 'disk', min: 10, icon: HardDrive },
  { key: 'smart', min: 30, icon: Search },
  { key: 'fans', min: 2, icon: Fan }
]

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' }
]

function onLocaleChange(code) {
  setLocale(code)
  settings.locale = code
}

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
        <h2><Settings :size="18" style="vertical-align: -3px; margin-right: 6px;" />{{ t('settings.title') }}</h2>
      </div>

      <!-- Language -->
      <div class="section">
        <h3>{{ t('settings.language') }}</h3>
        <div class="lang-switcher">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="lang-btn"
            :class="{ active: locale === lang.code }"
            @click="onLocaleChange(lang.code)"
          >{{ lang.label }}</button>
        </div>
      </div>

      <!-- Refresh Intervals -->
      <div class="section">
        <h3>{{ t('settings.refreshIntervals') }}</h3>
        <div class="settings-grid">
          <div class="setting-row" v-for="field in intervalFields" :key="field.key">
            <label class="setting-label">
              <span><component :is="field.icon" :size="14" style="vertical-align: -2px; margin-right: 6px;" />{{ t('settings.fieldNames.' + field.key) }}</span>
            </label>
            <div class="setting-input">
              <input type="number" class="mono" :min="field.min" v-model.number="settings.intervals[field.key]" />
              <span class="input-unit">{{ t('settings.sec') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Remote Targets -->
      <div class="section">
        <h3>{{ t('settings.remoteTargets') }}</h3>
        <div class="targets-list">
          <div class="target-item" v-for="(target, i) in settings.targets" :key="i" :class="{ active: settings.activeTarget === i }">
            <div class="target-info">
              <input type="radio" :value="i" v-model="settings.activeTarget" :id="'target-' + i" />
              <label :for="'target-' + i">
                <span class="target-name">{{ target.name }}</span>
                <span class="target-url mono">{{ target.url || t('settings.local') }}</span>
              </label>
            </div>
            <div class="target-actions">
              <button v-if="target.url" class="btn-sm" :disabled="settings.testing" @click="settings.testConnection(target.url)">
                <Link v-if="!settings.testing" :size="12" style="vertical-align: -2px; margin-right: 4px;" />
                {{ settings.testing ? '…' : t('settings.testConnection') }}
              </button>
              <button v-if="i > 0" class="btn-sm danger" @click="settings.removeTarget(i)"><X :size="12" /></button>
            </div>
          </div>
        </div>
        <div class="test-result" v-if="settings.testResult">
          <span :class="settings.testResult">
            <Check v-if="settings.testResult === 'success'" :size="14" style="vertical-align: -2px; margin-right: 4px;" />
            <X v-else :size="14" style="vertical-align: -2px; margin-right: 4px;" />
            {{ settings.testResult === 'success' ? t('settings.connectionOk') : t('settings.connectionFailed') }}
          </span>
        </div>
        <div class="add-target">
          <input v-model="newTargetName" :placeholder="t('settings.namePlaceholder')" class="input-field" />
          <input v-model="newTargetUrl" :placeholder="t('settings.urlPlaceholder')" class="input-field mono" />
          <button class="btn-sm primary" @click="addTarget" :disabled="!newTargetName || !newTargetUrl">{{ t('settings.addTarget') }}</button>
        </div>
      </div>

      <!-- Save Button -->
      <div class="section save-section">
        <button class="btn-primary" @click="handleSave" :disabled="settings.saving">
          <Save :size="14" style="vertical-align: -2px; margin-right: 4px;" />
          {{ settings.saving ? t('settings.saving') : t('settings.save') }}
        </button>
        <Transition name="fade">
          <span v-if="saveResult" class="save-toast" :class="saveResult">
            <Check v-if="saveResult === 'success'" :size="14" style="vertical-align: -2px;" />
            <X v-else :size="14" style="vertical-align: -2px;" />
            {{ saveResult === 'success' ? t('settings.saved') : t('settings.saveFailed') }}
          </span>
        </Transition>
      </div>
    </div>
  </div>
</template>
