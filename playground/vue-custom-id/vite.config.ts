import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
// import vuePlugin from '@vitejs/plugin-vue'
import vuePlugin from '../../packages/plugin-vue/src/index'
import { vueI18nPlugin } from '../vue/CustomBlockPlugin'

export default defineConfig({
  plugins: [
    vuePlugin({
      features: {
        componentIdGenerator: (filename) => {
          return filename
            .replace(/\.\w+$/, '')
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase()
        },
      },
    }),
    Inspect(),
    vueI18nPlugin,
  ],
  build: {
    // to make tests faster
    minify: false,
  },
})
