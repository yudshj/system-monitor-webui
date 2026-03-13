import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/style.css'
import { initToken } from './utils/token.js'

// Extract token from URL before anything else
initToken()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
