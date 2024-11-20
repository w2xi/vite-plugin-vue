# Handling `Vue style block` and transforming it, finally inserting it into HTML

`playground/vue-demo/src/components/HelloWorld.vue`:

```html
<script setup>
  import { ref } from 'vue'

  const msg = ref('Hello World')
</script>

<template>
  <h1>{{ msg }}</h1>
</template>

<style scoped>
  h1 {
    color: red;
  }
</style>
```

> `vite-plugin-vue` will recognize `.vue` files and parse it with `@vue/compiler-sfc` and generate `descriptor` including script, scriptSetup, template, styles, customBlocks, etc.

## Steps

Below are the steps to handle `Vue style block` within `.vue` file.

### Splitting `.vue` file into multiple parts in `transform` hook

Firstly, call `createDescriptor` function (under the hood, it calls `compiler.parse` in `@vue/compiler-sfc`) to generate descriptor which describes the `.vue` file.

```js
const { descriptor, errors } = createDescriptor(filename, code, options)
```

> check out `playground/vue-demo/src/components/HelloWorld.vue.descriptor.json`.

print `descriptor` to see the result:

```json
{
  // ... ignore other properties
  "styles": [
    {
      "type": "style",
      "content": "\nh1 {\n  color: red;\n}\n",
      "scoped": true,
      // ... ignore other properties
    }
  ],
  "template": '...',
  "script": null,
  "scriptSetup": '...',
  "customBlocks": [...],
  "id": "e17ea971", // component id
}
```

<!-- Now we just care about `styles` property, which is an array of `style` blocks. That's because Vue supports multiple `<style>` tags in a single `.vue` file. -->

Secondly, call `genScriptCode`, `genTemplateCode`, `genStyleCode` and `genCustomBlockCode` to generate the code of scriptCode, templateCode, stylesCode and customBlocksCode respectively.

Pseudo code is like below:

```ts
const { code: scriptCode, map: scriptMap } = await genScriptCode(...)
const { code: templateCode, map: templateMap } = await genTemplateCode(...)
const { code: stylesCode, map: stylesMap } = await genStyleCode(...)
const customBlocksCode = await genCustomBlockCode(...)

const output: string[] = [
  scriptCode,
  templateCode,
  customBlocksCode,
  stylesCode: 'import "D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/HelloWorld.vue?vue&type=style&index=0&scoped=e17ea971&lang.css"',
  // ... other code like hmr, ssr and virtual modules
]

// more detail see `playground/vue-demo/src/components/HelloWorld.vue.(output.json | resolvedCode.js)`
```

For `stylesCode` above, we may wonder how it would be transformed into css and how it would be inserted into `<style>` tag eventually?

Consider the following code:

```js
// ...ignore other code
import 'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/HelloWorld.vue?vue&type=style&index=0&scoped=e17ea971&lang.css'
```

![hooks-execution-workflow-diagram](./assets/hooks-execution-workflow-diagram.png)

Obviously, it will trigger `moduleParsed` hook of vite, and next it will trigger `resolveId`, `load` and `transform` hooks of vite again.
