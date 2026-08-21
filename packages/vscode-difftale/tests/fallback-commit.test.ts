import { describe, expect, test } from 'vitest'

import { createFallbackCommit } from '../src/fallback-commit'
import { getScopeFromPaths } from '../src/utils/get-scope-from-paths'

describe('local commit fallback', () => {
  test('infers a package scope from staged paths', () => {
    expect(
      getScopeFromPaths([
        'packages/checkout/src/cart.ts',
        'packages/checkout/tests/cart.test.ts'
      ])
    ).toBe('checkout')
  })

  test('uses documentation and test types when all paths match', () => {
    expect(createFallbackCommit(['docs/usage.md']).type).toBe('docs')
    expect(createFallbackCommit(['tests/history.test.ts']).type).toBe('test')
  })
})
