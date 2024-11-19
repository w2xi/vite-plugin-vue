## How to generate component id

The code below shows how to generate `component id` and you also can customize it by specifying `componentIdGenerator` in `vite.config.js` to generate your own id.

More detail check out: `packages\plugin-vue\src\utils\descriptorCache.ts#createDescriptor`

```js
import crypto from 'node:crypto'
import { normalizePath } from 'vite'
import path from 'node:path'

const hash =
  // eslint-disable-next-line n/no-unsupported-features/node-builtins -- crypto.hash is supported in Node 21.7.0+, 20.12.0+
  crypto.hash ??
  ((algorithm, data, outputEncoding) =>
    crypto.createHash(algorithm).update(data).digest(outputEncoding))

function getHash(text) {
  return hash('sha256', text, 'hex').substring(0, 8)
}

// This file just is a demo
// D:/www/demo/vite-project/src/components/HelloWorld.vue?vue&type=style&index=0&scoped=e17ea971&lang.css

const filename = 'D:/www/demo/vite-project/src/components/HelloWorld.vue'
const root = process.cwd()
const normalizedPath = normalizePath(path.relative(root, filename))
// development mode
const id = getHash(normalizedPath)
// production mode
// `source` is the source code of the file
// const id = getHash(normalizedPath + source)

console.log(
  JSON.stringify(
    {
      id,
      filename,
      root,
      normalizedPath,
      originalHash: hash('sha256', 'src/components/HelloWorld.vue', 'hex'),
    },
    null,
    2,
  ),
)

// output:
// {
//     "id": "e17ea971",
//     "filename": "D:/www/demo/vite-project/src/components/HelloWorld.vue",
//     "root": "D:\\www\\demo\\vite-project",
//     "normalizedPath": "src/components/HelloWorld.vue",
//     "originalHash": "e17ea97189bf2c22f00b4906c6ccd156a96060cc8fdeccd3a4ee23bfa2a758ad"
// }
```

## Examples

1. use `id` to isolate the style conflict

```html
<style>
  .demo {
    color: red;
  }
</style>
<div class="demo"></div>
```

The code below will be transformed to:

```html
<style>
  .demo[data-v-e17ea971] {
    color: red;
  }
</style>
<div class="demo"></div>
```
