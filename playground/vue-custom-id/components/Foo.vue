<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue'
import type { ConcreteComponent } from 'vue'

type A = ConcreteComponent & {
  i18n: {
    en: Record<string, string>
    ja: Record<string, string>
  }
}

const instance = getCurrentInstance()
const resources = (instance.type as A).i18n

console.log('instance', instance)

const t = (key) => resources.en[key] || resources.ja[key]
const msg = ref('Bar')
</script>

<template>
  <h1>{{ msg }}</h1>
  <p>{{ t('hello') }}</p>
</template>

<style scoped>
h1 {
  color: red;
}
</style>

<i18n lang="yaml">
en:
  hello: 'hello,vite!'
ja:
  hello: 'こんにちは、vite！'
</i18n>
