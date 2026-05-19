import { describe, test, expect } from 'vitest'
import { join } from 'node:path'
import { extractMacroMeta } from '../src/parser/macro-extractor'
import {
  testComponentVue,
  testExtendConstRefVue,
  testExtendPropsVue,
  basicComponentVue,
  multiCallVue,
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

describe('capability matrix — regex (main) vs AST (this branch)', () => {
  describe('simple inline object literal — both succeed', () => {
    test('regex: extracts plain object', () => {
      expect(regexExtract(testComponentVue)).toEqual({ hello: 'world', foo: 'bar' })
    })
    test('AST: extracts plain object', () => {
      const results = extractMacroMeta(testComponentVue, MACROS, join(DIR, 'TestComponent.vue'))
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({ hello: 'world', foo: 'bar' })
    })
  })

  describe('imported const reference — capability gap', () => {
    test('regex: returns null (eval throws on unresolved identifier)', () => {
      expect(regexExtract(testExtendConstRefVue)).toBeNull()
    })
    test('AST: resolves import and extracts value', () => {
      const results = extractMacroMeta(testExtendConstRefVue, MACROS, join(DIR, 'TestExtendConstRef.vue'))
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({ inputType: 'file' })
    })
  })

  describe('array argument — capability gap', () => {
    test('regex: returns null (pattern only matches `{...}`, not `[...]`)', () => {
      expect(regexExtract(testExtendPropsVue)).toBeNull()
    })
    test('AST: extracts array with transform', () => {
      const results = extractMacroMeta(testExtendPropsVue, MACROS_WITH_TRANSFORM, join(DIR, 'TestExtendProps.vue'))
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({ _studio: { filePath: 'file-picker' } })
    })
  })

  describe('multiple calls in one file — capability gap', () => {
    test('regex: finds only first call', () => {
      expect(regexExtract(multiCallVue)).toEqual({ hello: 'world' })
    })
    test('AST: finds all calls', () => {
      const results = extractMacroMeta(multiCallVue, MACROS, join(import.meta.dirname, 'multi-call.vue'))
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({ hello: 'world' })
      expect(results[1]).toEqual({ foo: 'bar' })
    })
  })

  describe('no macro present — negative path', () => {
    test('regex: returns null', () => {
      expect(regexExtract(basicComponentVue)).toBeNull()
    })
    test('AST: returns empty array', () => {
      const results = extractMacroMeta(basicComponentVue, MACROS, join(DIR, 'BasicComponent.vue'))
      expect(results).toHaveLength(0)
    })
  })
})
