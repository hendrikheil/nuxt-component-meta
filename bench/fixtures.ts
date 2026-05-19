import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dirname, '../test/fixtures/basic/app/components')

export const testComponentVue = readFileSync(join(FIXTURES_DIR, 'TestComponent.vue'), 'utf8')
export const testExtendConstRefVue = readFileSync(join(FIXTURES_DIR, 'TestExtendConstRef.vue'), 'utf8')
export const testExtendPropsVue = readFileSync(join(FIXTURES_DIR, 'TestExtendProps.vue'), 'utf8')
export const basicComponentVue = readFileSync(join(FIXTURES_DIR, 'BasicComponent.vue'), 'utf8')
export const normalScriptVue = readFileSync(join(FIXTURES_DIR, 'NormalScript.vue'), 'utf8')

export const multiCallVue = `<template><div /></template>
<script setup>
extendComponentMeta({ hello: 'world' })
extendComponentMeta({ foo: 'bar' })
defineProps({ title: String })
</script>`

export type ComponentSpec = { code: string; filename: string }

// 50 components, deterministic: every 3rd has extendComponentMeta, sizes rotate small/medium/large
export function generateSyntheticProject(count = 50): ComponentSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const hasMacro = i % 3 === 0
    const padding = buildScriptPadding(['small', 'medium', 'large'][i % 3] as 'small' | 'medium' | 'large', i)
    const macro = hasMacro ? `\nextendComponentMeta({ index: ${i}, label: 'component-${i}' })\n` : ''
    const code = `<template><div>${i}</div></template>\n<script setup>\n${macro}defineProps({ title: String })\n${padding}</script>`
    return { code, filename: `synthetic-${i}.vue` }
  })
}

function buildScriptPadding(size: 'small' | 'medium' | 'large', seed: number): string {
  const lines = size === 'small' ? 5 : size === 'medium' ? 40 : 120
  return Array.from({ length: lines }, (_, j) => `// line ${seed}-${j}`).join('\n') + '\n'
}
