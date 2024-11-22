# Handling `.vue` file

## Splitting `.vue` file into multiple parts

总的来说，`vite-plugin-vue` 会配合使用 `@vue/compiler-sfc` 将 `.vue` 文件处理成多个子模块，包括 `script`、`template`、`style` 和 [CustomBlock](https://github.com/w2xi/vite-plugin-vue/blob/debug/packages/plugin-vue/README.md#example-for-transforming-custom-blocks)

在 [@vue/compiler-sfc](https://github.com/w2xi/core/blob/chore/analysis/packages/compiler-sfc/README.md#vuecompiler-sfc) 中这样说道:

> The general idea is to generate a facade module that imports the individual blocks of the component. The trick is the module imports itself with different query strings so that the build system can handle each request as "virtual" modules:

```
                                  +--------------------+
                                  |                    |
                                  |  script transform  |
                           +----->+                    |
                           |      +--------------------+
                           |
+--------------------+     |      +--------------------+
|                    |     |      |                    |
|  facade transform  +----------->+ template transform |
|                    |     |      |                    |
+--------------------+     |      +--------------------+
                           |
                           |      +--------------------+
                           +----->+                    |
                                  |  style transform   |
                                  |                    |
                                  +--------------------+
```

翻译过来的意思大概就是: 生成一个门面模块，导入组件的各个独立block。技巧就是在模块导入自身的时候，加上不同的query字符串，这样构建系统就能把每个请求处理为"虚拟"模块。

这里我们使用一个 [Demo](../playground/vue-demo/src/components/srcImports/index.vue) 来演示下效果。如下所示，通过 [src imports](https://vuejs.org/api/sfc-spec.html#src-imports) 方式导入各个 block:

> 注意：大部分时候我们一般使用 `<script>` 或 `<script setup>` 这种方式来声明 vue 组件，而不是 `src Imports` 这种方式，因此转换规则会有所不同。为了方便演示模块的转换(模块导入自身的时候，加上不同的query字符串)，我们在这里使用 `src Imports` 方式。

`index.vue`:

```html
<template src="./template.html"></template>
<style src="./style.css"></style>
<script src="./script.js"></script>
```

经过 `transform` hook 钩子:

```js
async function transform(code, id, opt) {
  const { filename, query } = parseVueRequest(id)
  if (!filter.value(filename) && !query.vue) {
    return
  }
  if (!query.vue) {
    // main request
    return transformMain(...)
  } else {
    // ... sub block request
  }
}
```

`transformMain` 函数的伪代码如下:

```ts
async function transformMain(...) {
  const { code: scriptCode } = await genScriptCode(...)
  const { code: templateCode } = await genTemplateCode(...)
  const stylesCode = await genStyleCode(...)

  const output: string[] = [
    scriptCode,
    templateCode,
    stylesCode,
  ]

  // ... ignore other code

  let resolvedCode = output.join('\n')

  return {
    code: resolvedCode,
    // ...
  }
}
```

转换后，得到的 `resolvedCode` 如下:

```js
// script
import _sfc_main from './script.js?vue&type=script&src=true&lang.js'
export * from './script.js?vue&type=script&src=true&lang.js'
// template
import { render as _sfc_render } from './template.html?vue&type=template&src=true&lang.js'
// style
import './style.css?vue&type=style&index=0&src=true&lang.css'

// ...ignore other code
```

也就得到了在前面所说的，将 `.vue` 文件分成多个子模块的效果 ———— 导入自身的时候，加上不同的query字符串。这样构建系统就能把每个请求处理为"虚拟"模块。

下图是 [rollup hooks](https://rollupjs.org/plugin-development/#build-hooks) 执行流程图:

![hooks-execution-workflow-diagram](./assets/hooks-execution-workflow-diagram.png)

可以看到，在经过 `transform` hook 转换后，下一步就是执行 `moduleParsed` hook，它会解析所有的静态 `import` 语句，

Obviously, it will trigger `resolveId`, `load` and `transform` hooks again when executing [moduleParsed](https://rollupjs.org/plugin-development/#moduleparsed) hook to resolves all discovered static imports.

As virtual modules in resolveId hook:

```js
async function resolveId(id) {
  // serve sub-part requests (*?vue) as virtual modules
  if (parseVueRequest(id).query.vue) {
    return id
  }
}
```

## `<script setup>`

接下来让我们来看看具体的代码实现。

[HelloWorld.vue](../playground/vue-demo/src/components/HelloWorld.vue)

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

[App.vue](../playground/vue-demo/src/App.vue)

```html
<script setup lang="ts">
  import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <HelloWorld />
</template>
```

```ts
async function transform(code, id, opt) {
  const { filename, query } = parseVueRequest(id)
  if (!filter.value(filename) && !query.vue) {
    return
  }
  if (!query.vue) {
    // main request
    return transformMain(...)
  } else {
    // ... sub block request
  }
}
```

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
// multiple <style> blocks if present
// import 'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/HelloWorld.vue?vue&type=style&index=1&scoped=e17ea971&lang.css'
// ...
```

![hooks-execution-workflow-diagram](./assets/hooks-execution-workflow-diagram.png)

Obviously, it will trigger `resolveId`, `load` and `transform` hooks again when executing [moduleParsed](https://rollupjs.org/plugin-development/#moduleparsed) hook to resolves all discovered static imports.

As virtual modules in resolveId hook:

```js
async function resolveId(id) {
  // serve sub-part requests (*?vue) as virtual modules
  if (parseVueRequest(id).query.vue) {
    return id
  }
}
```

Get `<style>` block's content in load hook:

```ts
function load(id: string) {
  const { filename, query } = parseVueRequest(id)
  // select corresponding block for sub-part virtual modules
  if (query.vue) {
    const descriptor = getDescriptor(filename, options.value)!
    let block: SFCBlock | null | undefined

    // ...ignore other if-condition blocks

    if (query.type === 'style') {
      block = descriptor.styles[query.index!]
    }
    if (block) {
      return {
        code: block.content, // here is: "h1 {color: red;}"
        map: block.map as any,
      }
    }
  }
}
```

Finally, transform the `<style>` block's content in transform hook, which process will call `transformStyle` function (under the hood, it's `compiler.compileStyleAsync` (@vue/compiler-sfc)) to generate the end css string.

```ts
async function transform(code, id, opt) {
  const { filename, query } = parseVueRequest(id)
  const descriptor = query.src
    ? getSrcDescriptor(filename, query) || getTempSrcDescriptor(filename, query)
    : getDescriptor(filename, options.value)!

  // ...ignore other if-condition blocks

  if (query.type === 'style') {
    const result = await transformStyle(
      code,
      descriptor,
      Number(query.index || 0),
      options.value,
      this,
      filename,
    )
    return result
  }
  // output:
  // {
  //   code: 'h1[data-v-e17ea971] {color: red;}',
  //   map: {
  //     // ...
  //   },
  // }
}
```

Raw code of `<style>` block:

```html
<style scoped>
  h1 {
    color: red;
  }
</style>
```

After `vite:vue` plugin process the `<style>` block, it will be transformed into: "h1[data-v-e17ea971] {color: red;}"

After `vite:css-post` plugin process former code, it will be transformed into:

`vite\packages\vite\src\node\plugins\css.ts#cssPostPlugin`:

```js
import {
  updateStyle as __vite__updateStyle,
  removeStyle as __vite__removeStyle,
} from '/@vite/client'
const __vite__id =
  'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/HelloWorld.vue?vue&type=style&index=0&scoped=e17ea971&lang.css'
const __vite__css = '\nh1[data-v-e17ea971] {\n  color: red;\n}\n'
__vite__updateStyle(__vite__id, __vite__css)
import.meta.hot.accept()
import.meta.hot.prune(() => __vite__removeStyle(__vite__id))
```

`updateStyle` function looks like this:

`vite\packages\vite\src\client\client.ts#updateStyle`

```ts
export function updateStyle(id: string, content: string): void {
  let style = sheetsMap.get(id)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.setAttribute('data-vite-dev-id', id)
    style.textContent = content
    // insert into html
    document.head.appendChild(style)
  } else {
    style.textContent = content
  }
  sheetsMap.set(id, style)
}
```
