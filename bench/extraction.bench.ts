import { describe, bench, beforeAll } from 'vitest'
import { join } from 'node:path'
import { extractMacroMeta } from '../src/parser/macro-extractor'
import {
  testComponentVue,
  testExtendConstRefVue,
  testExtendPropsVue,
  basicComponentVue,
  normalScriptVue,
  multiCallVue,
  generateSyntheticProject,
  type ComponentSpec,
} from './fixtures'
import type { ExtendMetaFunction } from '../src/types/module'

// Inlined from main (src/parser/meta-parser.ts ~L190-194)
function regexExtract(code: string): unknown {
  const m = code.match(/extendComponentMeta\((\{[\s\S]*?\})\)/)
  if (!m) return null
  try { return eval(`(${m[1]})`) } catch { return null }
}

const MACROS: ExtendMetaFunction[] = [{ name: 'extendComponentMeta' }]
const MACROS_WITH_TRANSFORM: ExtendMetaFunction[] = [
  { name: 'extendComponentMeta' },
  { name: 'extendProps', transform: (e: any) => ({ _studio: e }) },
]

const DIR = join(import.meta.dirname, '../test/fixtures/basic/app/components')

// ─── Group 1: Single-file hot path (apples-to-apples) ───────────────────────
describe('hot path — single file with macro (apples-to-apples)', () => {
  bench('regex+eval', () => {
    regexExtract(testComponentVue)
  })
  bench('oxc AST', () => {
    extractMacroMeta(testComponentVue, MACROS, join(DIR, 'TestComponent.vue'))
  })
})

// ─── Group 2: Negative path (no macro) ──────────────────────────────────────
// Dominates real builds — most files don't use the macro at all.
describe('negative path — BasicComponent.vue (43 lines, no macro)', () => {
  bench('regex+eval', () => {
    regexExtract(basicComponentVue)
  })
  bench('oxc AST', () => {
    extractMacroMeta(basicComponentVue, MACROS, join(DIR, 'BasicComponent.vue'))
  })
})

describe('negative path — NormalScript.vue (67 lines, no macro)', () => {
  bench('regex+eval', () => {
    regexExtract(normalScriptVue)
  })
  bench('oxc AST', () => {
    extractMacroMeta(normalScriptVue, MACROS, join(DIR, 'NormalScript.vue'))
  })
})

// ─── Group 3: Realistic project sweep ───────────────────────────────────────
// 50 components, ~33% with macro, varying sizes. One iteration = one full build pass.
describe('project sweep — 50 components (~33% with macro, sizes: small/medium/large)', () => {
  let project: ComponentSpec[] = []
  beforeAll(() => { project = generateSyntheticProject(50) })

  bench('regex+eval — all 50 files', () => {
    for (const { code } of project) regexExtract(code)
  })
  bench('oxc AST — all 50 files', () => {
    for (const { code, filename } of project) extractMacroMeta(code, MACROS_WITH_TRANSFORM, filename)
  })
})

// ─── Group 4: Capability-gap (AST only) ─────────────────────────────────────
// These inputs the regex cannot handle. Regex outcome is annotated in the bench name.
describe('capability gap — inputs regex cannot handle (AST timings only)', () => {
  // regex eval throws on `InputType.FILE` identifier ref → returns null
  bench('imported const ref  [regex → eval throws, returns null]', () => {
    extractMacroMeta(testExtendConstRefVue, MACROS, join(DIR, 'TestExtendConstRef.vue'))
  })
  // regex pattern `\{…\}` never matches `[…]` → returns null
  bench('array argument      [regex → no-match, returns null]', () => {
    extractMacroMeta(testExtendPropsVue, MACROS_WITH_TRANSFORM, join(DIR, 'TestExtendProps.vue'))
  })
  // regex finds only the first `{…}` block, misses second call
  bench('multi-call file     [regex → finds only first call]', () => {
    extractMacroMeta(multiCallVue, MACROS, join(import.meta.dirname, 'multi-call.vue'))
  })
})
