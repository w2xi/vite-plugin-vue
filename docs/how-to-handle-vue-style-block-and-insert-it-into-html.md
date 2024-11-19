## Handling `Vue style block` and transforming it, finally inserting it into HTML

`src/components/HelloWorld.vue`:

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

Steps to transform `.vue` file:
