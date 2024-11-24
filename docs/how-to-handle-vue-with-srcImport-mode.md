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

也就得到了在前面所说的，将 `.vue` 文件分成多个子模块的效果 ———— 导入自身的时候，加上不同的query字符串，这样构建系统就能把每个请求处理为"虚拟"模块。

下图是 [rollup hooks](https://rollupjs.org/plugin-development/#build-hooks) 执行流程图:

![hooks-execution-workflow-diagram](./assets/hooks-execution-workflow-diagram.png)

可以看到，在经过 `transform` hook 转换后，下一步就是执行 [moduleParsed](https://rollupjs.org/plugin-development/#moduleparsed) hook，它会解析所有的静态 `import` 语句，如上文的 `resolvedCode`，然后再依次执行 `resolveId`, `load` 和 `transform` 等钩子，如此反复，直到所有的静态 `import` 语句都被解析完毕。

`resolveId` hook 代码如下:

```js
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

可以看到，它会将子请求(\*?vue)处理为虚拟模块，以配合 `load` hook 提供虚拟模块的内容。

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
    // 获取vue文件的描述符
    const descriptor = getDescriptor(filename, options.value)!
    let block: SFCBlock | null | undefined
    if (query.type === 'script') {
      // handle <script> + <script setup> merge via compileScript()
      block = resolveScript(
        descriptor,
        options.value,
        ssr,
        customElementFilter.value(filename),
      )
    } else if (query.type === 'template') {
      block = descriptor.template!
    } else if (query.type === 'style') {
      // vue 支持多个 <style> 标签，因此 index 表示是第几个 <style> 标签
      block = descriptor.styles[query.index!]
    } else if (query.index != null) {
      // 自定义 block
      block = descriptor.customBlocks[query.index]
    }
    if (block) {
      return {
        code: block.content,
        map: block.map as any,
      }
    }
  }
}
```

由于这里的 demo 都是 `src imports` 的形式，所以会直接读取文件内容并返回。

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
    return transformMain(
      code,
      filename,
      options.value,
      this,
      ssr,
      customElementFilter.value(filename),
    )
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
