import { describe, expect, test } from 'vitest'

import {
  fitDiffToCharacterLimit,
  getDiffFilePaths
} from '../src/utils/fit-diff-to-character-limit'

describe('fitDiffToCharacterLimit', () => {
  test('keeps context from each changed file when truncating', () => {
    const diff = [
      'diff --git a/first.ts b/first.ts',
      '--- a/first.ts',
      '+++ b/first.ts',
      ...Array.from({ length: 20 }, (_, index) => `+first-${index}`),
      'diff --git a/second.ts b/second.ts',
      '--- a/second.ts',
      '+++ b/second.ts',
      ...Array.from({ length: 20 }, (_, index) => `+second-${index}`)
    ].join('\n')

    const result = fitDiffToCharacterLimit(diff, 260)

    expect(result).toContain('diff --git a/first.ts b/first.ts')
    expect(result).toContain('diff --git a/second.ts b/second.ts')
    expect(result).toContain('[diff truncated by Difftale]')
    expect(result.length).toBeLessThanOrEqual(260)
  })

  test('returns a small diff unchanged', () => {
    expect(fitDiffToCharacterLimit('small diff', 100)).toBe('small diff')
  })

  test('extracts changed file paths for prompt context', () => {
    const diff = [
      '--- a/source.ts',
      '+++ b/source.ts',
      '--- /dev/null',
      '+++ b/new-file.ts'
    ].join('\n')

    expect(getDiffFilePaths(diff)).toEqual(['source.ts', 'new-file.ts'])
  })
})
