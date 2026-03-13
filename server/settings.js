import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SETTINGS_PATH = join(__dirname, 'settings.json')

const DEFAULTS = {
  intervals: {
    cpu: 2,
    memory: 5,
    gpu: 5,
    network: 60,
    disk: 30,
    smart: 300,
    fans: 10,
    temperature: 10
  },
  targets: [{ name: 'Local', url: '' }],
  activeTarget: 0,
  locale: 'zh'
}

export function getDefaults() {
  return JSON.parse(JSON.stringify(DEFAULTS))
}

export function loadSettings(filePath = SETTINGS_PATH) {
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8')
      const saved = JSON.parse(raw)
      return { ...getDefaults(), ...saved, intervals: { ...DEFAULTS.intervals, ...(saved.intervals || {}) } }
    }
  } catch { /* ignore parse errors, return defaults */ }
  return getDefaults()
}

export function saveSettings(settings, filePath = SETTINGS_PATH) {
  writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
  return settings
}
