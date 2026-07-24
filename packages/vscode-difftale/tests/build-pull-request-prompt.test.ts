import { describe, expect, test } from 'vitest'

import { buildPullRequestPrompt } from '../src/ai/build-pull-request-prompt'

describe('buildPullRequestPrompt', () => {
  test('includes branch context, commits, instructions, and a truncated diff', () => {
    const prompt = buildPullRequestPrompt({
      context: {
        baseBranch: 'main',
        commitSubjects: ['feat(pr): add composer'],
        currentBranch: 'feature/composer',
        diff: '123456789',
      },
      settings: {
        allowedTypes: ['feat', 'fix'],
        customInstructions: ['Mention accessibility changes.'],
        draftCount: 3,
        maximumDiffLengthCharacters: 5,
        maximumHeaderLengthCharacters: 72,
      },
    })

    expect(prompt).toContain('Current branch: feature/composer')
    expect(prompt).toContain('Base branch: main')
    expect(prompt).toContain('feat(pr): add composer')
    expect(prompt).toContain('Mention accessibility changes.')
    expect(prompt).toContain('12345')
    expect(prompt).not.toContain('123456')
  })
})
