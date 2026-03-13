import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      include: ['server/**/*.js', 'src/stores/**/*.js'],
      exclude: ['node_modules', 'dist', 'tests']
    }
  }
})
