import { describe, bench } from 'vitest'
import { stripMacroCalls } from '../src/parser/macro-extractor'

// No main-branch equivalent — stripMacroCalls is new on this branch.
// Runs per-file per-build via the unplugin transform hook (no content-hash cache).
const MACRO_NAMES = ['extendComponentMeta', 'extendProps']

const JS_WITH_MACROS = `import { defineComponent } from 'vue'
extendComponentMeta({ hello: 'world', foo: 'bar' })
extendProps({ filePath: 'file-picker' })
const MyComponent = defineComponent({ name: 'MyComponent', props: { title: String } })
export default MyComponent`

const JS_NO_MACROS = `import { defineComponent } from 'vue'
const MyComponent = defineComponent({ name: 'MyComponent', props: { title: String, label: String } })
export default MyComponent`

describe('stripMacroCalls — per-file transform cost (no main equivalent, no content-hash cache)', () => {
  bench('with macro calls present (full parse + strip)', () => {
    stripMacroCalls(JS_WITH_MACROS, MACRO_NAMES, 'component.js')
  })
  bench('no macro calls — string-contains fast path', () => {
    stripMacroCalls(JS_NO_MACROS, MACRO_NAMES, 'component.js')
  })
})
