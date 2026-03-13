import { ref, computed } from 'vue'
import en from './en.js'
import zh from './zh.js'

const messages = { en, zh }
const currentLocale = ref('zh')

export function setLocale(locale) {
  if (messages[locale]) currentLocale.value = locale
}

export function getLocale() {
  return currentLocale.value
}

/**
 * Translation function. Supports dot-path keys: t('cpu.usage')
 */
export function t(key) {
  const lang = messages[currentLocale.value] || messages.en
  const fallback = messages.en
  const parts = key.split('.')
  let val = lang
  let fb = fallback
  for (const p of parts) {
    val = val?.[p]
    fb = fb?.[p]
  }
  return val ?? fb ?? key
}

export function useI18n() {
  return {
    t: (key) => {
      // Make it reactive by reading currentLocale
      const _ = currentLocale.value
      return t(key)
    },
    locale: currentLocale,
    setLocale
  }
}
