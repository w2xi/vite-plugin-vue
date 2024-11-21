import { defineConfig } from 'vite'
// import vue from '@vitejs/plugin-vue'
import vue from '../../packages/plugin-vue/src/index'
import Inspect from 'vite-plugin-inspect'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), Inspect()],
})
