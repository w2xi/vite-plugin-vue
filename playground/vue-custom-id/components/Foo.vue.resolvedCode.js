import { defineComponent as _defineComponent } from "vue";
import { ref, getCurrentInstance } from "vue";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "Foo",
  setup(__props, { expose: __expose }) {
    __expose();
    const instance = getCurrentInstance();
    const resources = instance.type.i18n;
    console.log("instance", instance);
    const t = (key) => resources.en[key] || resources.ja[key];
    const msg = ref("Bar");
    const __returned__ = { instance, resources, t, msg };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue";
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return _openBlock(), _createElementBlock(
    _Fragment,
    null,
    [
      _createElementVNode(
        "h1",
        null,
        _toDisplayString($setup.msg),
        1
        /* TEXT */
      ),
      _createElementVNode(
        "p",
        null,
        _toDisplayString($setup.t("hello")),
        1
        /* TEXT */
      )
    ],
    64
    /* STABLE_FRAGMENT */
  );
}
import "D:/www/github/vite-plugin-vue/playground/vue-custom-id/components/Foo.vue?vue&type=style&index=0&scoped=components-foo&lang.css";
import block0 from "D:/www/github/vite-plugin-vue/playground/vue-custom-id/components/Foo.vue?vue&type=i18n&index=0&lang.yaml";
if (typeof block0 === "function") block0(_sfc_main);
_sfc_main.__hmrId = "components-foo";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.on("file-changed", ({ file }) => {
  __VUE_HMR_RUNTIME__.CHANGED_FILE = file;
});
import.meta.hot.accept((mod) => {
  if (!mod) return;
  const { default: updated, _rerender_only } = mod;
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
  }
});
import _export_sfc from "\0plugin-vue:export-helper";
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-components-foo"], ["__file", "D:/www/github/vite-plugin-vue/playground/vue-custom-id/components/Foo.vue"]]);
