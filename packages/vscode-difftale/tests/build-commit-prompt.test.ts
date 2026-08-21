import { describe, expect, test } from 'vitest'

import { buildCommitPrompt } from '../src/ai/build-commit-prompt'

describe('buildCommitPrompt', () => {
  test('includes repository context and truncates the diff', () => {
    const prompt = buildCommitPrompt({
      context: {
        configurationFiles: ['commitlint.config.js'],
        recentSubjects: ['feat(checkout): add cart'],
        suggestedScopes: ['checkout']
      },
      diff: '123456789',
      settings: {
        allowedTypes: ['feat', 'fix'],
        customInstructions: ['Prefer product scopes.'],
        draftCount: 3,
        maximumDiffLengthCharacters: 5,
        maximumHeaderLengthCharacters: 72
      }
    })

    expect(prompt).toContain('commitlint.config.js')
    expect(prompt).toContain('feat(checkout): add cart')
    expect(prompt).toContain('12345')
    expect(prompt).not.toContain('123456')
  })

  test('lists every changed file independently from the fitted diff', () => {
    const prompt = buildCommitPrompt({
      context: {
        configurationFiles: [],
        recentSubjects: [],
        suggestedScopes: []
      },
      diff: [
        '--- a/first.ts',
        '+++ b/first.ts',
        '+first',
        '--- a/second.ts',
        '+++ b/second.ts',
        '+second'
      ].join('\n'),
      settings: {
        allowedTypes: ['feat'],
        customInstructions: [],
        draftCount: 1,
        maximumDiffLengthCharacters: 40,
        maximumHeaderLengthCharacters: 72
      }
    })

    expect(prompt).toContain('Changed files:\n\nfirst.ts\nsecond.ts')
  })
})
