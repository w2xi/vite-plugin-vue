import { defineComponent as _defineComponent } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: 'App',
  setup(__props, { expose: __expose }) {
    __expose()
    const __returned__ = { HelloWorld }
    Object.defineProperty(__returned__, '__isScriptSetup', {
      enumerable: false,
      value: true,
    })
    return __returned__
  },
})
import { openBlock as _openBlock, createBlock as _createBlock } from 'vue'
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return _openBlock(), _createBlock($setup['HelloWorld'])
}
_sfc_main.__hmrId = '7a7a37b1'
typeof __VUE_HMR_RUNTIME__ !== 'undefined' &&
  __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main)
import.meta.hot.on('file-changed', ({ file }) => {
  __VUE_HMR_RUNTIME__.CHANGED_FILE = file
})
import.meta.hot.accept((mod) => {
  if (!mod) return
  const { default: updated, _rerender_only } = mod
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render)
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)
  }
})
import _export_sfc from '\0plugin-vue:export-helper'
export default /* @__PURE__ */ _export_sfc(_sfc_main, [
  ['render', _sfc_render],
  ['__file', 'D:/www/github/vite-plugin-vue/playground/vue-demo/src/App.vue'],
])
