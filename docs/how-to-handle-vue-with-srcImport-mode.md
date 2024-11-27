# `.vue` 文件的处理

## `.vue` 文件分割为多个子模块

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

`transform` hook 代码如下:

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

`transformMain` 函数的代码如下:

```ts
async function transformMain(
  code: string,
  filename: string,
  options: ResolvedOptions,
  // ... other params
) {
  // 创建 .vue 文件的描述符，包含了 script, template, style 等信息
  const { descriptor } = createDescriptor(filename, code, options)
  // 生成 script 代码
  const { code: scriptCode } = await genScriptCode(...)
  // 生成 template 代码
  const { code: templateCode } = await genTemplateCode(...)
  // 生成 style 代码
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

// 创建 vue 组件的描述符
function createDescriptor(
  filename: string,
  source: string,
) {
  // 调用 @vue/compiler-sfc 的 parse 函数来解析 .vue 文件的代码
  const { descriptor, errors } = compiler.parse(source, {
    filename,
    // other options
  })
  return { descriptor }
}
```

而上面的 `descriptor` 描述符就是一个对象，下面是打印的 `json` 格式的数据:

> 具体见 `playground/vue-demo/src/components/srcImports/index.vue.descriptor.json` 文件

```json
{
  "filename": "D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/index.vue",
  "source": "<template src=\"./template.html\"></template>\n<style src=\"./style.css\"></style>\n<script src=\"./script.js\"></script>\n",
  "template": {
    "type": "template",
    "content": "",
    "attrs": {
      "src": "./template.html"
    },
    "src": "./template.html"
  },
  "script": {
    "type": "script",
    "content": "",
    "attrs": {
      "src": "./script.js"
    },
    "src": "./script.js"
  },
  "scriptSetup": null,
  "styles": [
    {
      "type": "style",
      "content": "",
      "attrs": {
        "src": "./style.css"
      },
      "src": "./style.css"
    }
  ],
  "customBlocks": [],
  "id": "b2ef2ffb"
  // 省略了部分属性
}
```

这里，可以重点关注下 `script`, `template` 和 `styles` 属性，可以看到它们都有一个 `src` 属性用于引入外部文件。

而最终，这里的 `transformMain` 函数得到的 `resolvedCode` 如下:

```js
// script
import _sfc_main from './script.js?vue&type=script&src=true&lang.js'
export * from './script.js?vue&type=script&src=true&lang.js'
// template
import { render as _sfc_render } from './template.html?vue&type=template&src=true&lang.js'
// style
import './style.css?vue&type=style&index=0&src=true&lang.css'

// ... ignore HMR code

import _export_sfc from 'plugin-vue:export-helper'
export default /*#__PURE__*/ _export_sfc(_sfc_main, [
  ['render', _sfc_render],
  [
    '__file',
    'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/index.vue',
  ],
])
```

也就得到了在前面所说的，将 `.vue` 文件分成多个子模块的效果 ———— 导入自身的时候，加上不同的query字符串，这样构建系统就能把每个请求处理为"虚拟"模块。

下图是 [rollup hooks](https://rollupjs.org/plugin-development/#build-hooks) 执行流程图:

![hooks-execution-workflow-diagram](./assets/hooks-execution-workflow-diagram.png)

可以看到，在经过 `transform` hook 转换后，下一步就是执行 [moduleParsed](https://rollupjs.org/plugin-development/#moduleparsed) hook，它会解析所有的静态 `import` 语句，如上文的 `resolvedCode`，然后再依次执行 `resolveId`, `load` 和 `transform` 等钩子，如此反复，直到所有的静态 `import` 语句都被解析完毕。

`resolveId` hook 代码如下:

```js
// plugin-vue/src/helper.ts
export const EXPORT_HELPER_ID = '\0plugin-vue:export-helper'

async function resolveId(id) {
  // component export helper
  if (id === EXPORT_HELPER_ID) {
    return id
  }
  // serve sub-part requests (*?vue) as virtual modules
  if (parseVueRequest(id).query.vue) {
    return id
  }
}
```

可以看到，当解析到:

1. `import _export_sfc from 'plugin-vue:export-helper'`
2. `import xxx from *?vue`

这中类似请求时，会被转换为虚拟模块。

再来看看 `load` hook 的代码:

```js
function load(id, opt) {
  const ssr = opt?.ssr === true
  if (id === EXPORT_HELPER_ID) {
    return helperCode
  }
  // 解析文件名和查询参数
  const { filename, query } = parseVueRequest(id)
  // 为 sub-part 虚拟模块选择相应的块 (script, template, style, customBlock)
  if (query.vue) {
    if (query.src) {
      // 如果是 src imports 的形式，则返回文件内容
      // case 1: "*.js?vue&type=script&src=true&lang.js"
      // case 2: "*.html?vue&type=template&src=true&lang.js"
      // case 3: "*.css?vue&type=style&index=0&src=true&lang.css"
      return fs.readFileSync(filename, 'utf-8')
    }
    // ...ignore other code
  }
}
```

可以看到，当 `id === EXPORT_HELPER_ID`，会直接返回 helperCode，即:

`plugin-vue/src/helper.ts`

```ts
export const EXPORT_HELPER_ID = '\0plugin-vue:export-helper'

export const helperCode = `
export default (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
}
`
```

再结合前面出现在 `resolveCode` 中的代码:

```js
import _export_sfc from 'plugin-vue:export-helper'
export default /*#__PURE__*/ _export_sfc(_sfc_main, [
  ['render', _sfc_render],
  [
    '__file',
    'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/index.vue',
  ],
])
```

等价于 <=>

```js
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc
  for (const [key, val] of props) {
    target[key] = val
  }
  return target
}
// 将渲染函数添加到组件上
_sfc_main.render = _sfc_render
_sfc_main.__file =
  'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/index.vue'

export default _sfc_main
```

再来看看 `transform` hook 代码:

```js
async function transform(code, id, opt) {
  const ssr = opt?.ssr === true
  const { filename, query } = parseVueRequest(id)

  if (query.raw || query.url) {
    return
  }
  if (!filter.value(filename) && !query.vue) {
    return
  }
  if (!query.vue) {
    // main request
    return transformMain(...)
  } else {
    // sub block request
    const descriptor = query.src
      ? getSrcDescriptor(filename, query) ||
        getTempSrcDescriptor(filename, query)
      : getDescriptor(filename, options.value)!

    if (query.type === 'template') {
      // case: "*.html?vue&type=template&src=true&lang.js"
      return transformTemplateAsModule(
        code,
        descriptor,
        options.value,
        this,
        ssr,
        customElementFilter.value(filename),
      )
    } else if (query.type === 'style') {
      // case: "*.css?vue&type=style&index=0&src=true&lang.css"
      return await transformStyle(
        code,
        descriptor,
        Number(query.index || 0),
        options.value,
        this,
        filename,
      )
    }
  }
}
```

可以看到，`transform` hook 中，会对子模块的请求进行处理。

如果 `query.type === 'template'`，则会调用 `transformTemplateAsModule` 函数，该函数其实是调用了 `@vue/compiler-sfc` 的 `compileTemplate` 函数————将模板字符串编译成渲染函数字符串。

如果 `query.type === 'style'`，则会调用 `transformStyle` 函数，该函数其实是调用了 `@vue/compiler-sfc` 的 `compileStyleAsync` 函数————对 css 进行处理 (应用 css 预处理器，postcss 等转换成原生 css 格式)。

对于 `template`:

```js
import { render as _sfc_render } from './template.html?vue&type=template&src=true&lang.js'
```

转换后得到:

```js
import {
  toDisplayString as _toDisplayString,
  openBlock as _openBlock,
  createElementBlock as _createElementBlock,
} from 'vue'

const _hoisted_1 = { class: 'test' }

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    _openBlock(),
    _createElementBlock(
      'div',
      _hoisted_1,
      _toDisplayString(_ctx.msg),
      1 /* TEXT */,
    )
  )
}
```

对于 `style`:

```js
import './style.css?vue&type=style&index=0&src=true&lang.css'
```

转换后得到:

> 因为这里用的是原生 css ，所以没有做任何转换处理，如果使用的是 less, scss, stylus 等预处理器语言，则会被转换成原生的 css。

```css
.test {
  color: orange;
}
```

显然，对于上面的 css 字符串，浏览器是不认识的，因此还需要进一步处理将其写入到 html 中。

那它是如何被处理的呢？这就需要靠 vite 内置的插件来处理了，它依次被 `vite:css`, 和 `vite:css-post` 插件处理，最终得到的结果如下:

```js
import {
  updateStyle as __vite__updateStyle,
  removeStyle as __vite__removeStyle,
} from '/@vite/client'
const __vite__id =
  'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/style.css'
const __vite__css = '.test {\n  color: orange;\n}\n'
__vite__updateStyle(__vite__id, __vite__css)

// ...ignore HMR code
```

即:

```ts
const __vite__updateStyle = updateStyle
const __vite__id =
  'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/style.css'
const __vite__css = '.test {\n  color: orange;\n}\n'
__vite__updateStyle(__vite__id, __vite__css)

// `vite\packages\vite\src\client\client.ts#updateStyle`
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

而对于 `script`, `transform` hook 并没有对它做任何处理，而是在 `load` hook 中:

```js
function load(id, opt) {
  // ...
  const { filename, query } = parseVueRequest(id)
  if (query.vue) {
    if (query.src) {
      // 如果是 src imports 的形式，则返回文件内容
      // case: "*.js?vue&type=script&src=true&lang.js"
      return fs.readFileSync(filename, 'utf-8')
    }
  }
  // ...
}
```

可以看到，`script` 的内容直接从文件中读取并返回了。

所以，对于 `index.vue`:

```html
<template src="./template.html"></template>
<style src="./style.css"></style>
<script src="./script.js"></script>
```

在第一次 `transform` hook，会被 `transformMain` 函数处理，得到的 `resolvedCode` 如下:

```js
// script
import _sfc_main from './script.js?vue&type=script&src=true&lang.js'
export * from './script.js?vue&type=script&src=true&lang.js'
// template
import { render as _sfc_render } from './template.html?vue&type=template&src=true&lang.js'
// style
import './style.css?vue&type=style&index=0&src=true&lang.css'

// ... ignore HMR code

import _export_sfc from 'plugin-vue:export-helper'
export default /*#__PURE__*/ _export_sfc(_sfc_main, [
  ['render', _sfc_render],
  [
    '__file',
    'D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/index.vue',
  ],
])
```

然后，在经过一系列处理后，最终会得到:

```js
// script
const _sfc_main = {
  name: 'Test',
  setup() {
    return {
      msg: 'Hello App',
    }
  },
}

// template
import { toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "test" }

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, _toDisplayString(_ctx.msg), 1 /* TEXT */))
}

// style
const __vite__id = "D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/style.css"
const __vite__css = ".test {\n  color: orange;\n}\n"
__vite__updateStyle(__vite__id, __vite__css)

function __vite__updateStyle(id: string, content: string): void {
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

// ... ignore HMR code

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
}

_sfc_main.render = _sfc_render
_sfc_main.__file = "D:/www/github/vite-plugin-vue/playground/vue-demo/src/components/srcImports/index.vue"

export default _sfc_main
```
