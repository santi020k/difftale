import { describe, expect, test } from 'vitest'

import { fitPullRequestPrompt } from '../src/ai/fit-pull-request-prompt'
import { MODEL_PROMPT_TOKEN_HEADROOM_COUNT } from '../src/constants'

const settings = {
  allowedTypes: ['feat', 'fix'],
  customInstructions: [],
  draftCount: 3,
  maximumDiffLengthCharacters: 60_000,
  maximumHeaderLengthCharacters: 72
}

const context = {
  baseBranch: 'origin/main',
  commitSubjects: ['feat(pr): add composer'],
  currentBranch: 'feature/composer',
  diff: 'changed-line\n'.repeat(5_000)
}

const countTokens = (prompt: string): Promise<number> => Promise.resolve(Math.ceil(prompt.length / 4))

describe('fitPullRequestPrompt', () => {
  test('truncates the diff until the prompt fits the selected model', async () => {
    const maximumInputTokens = 1_000
    const result = await fitPullRequestPrompt({
      context,
      countTokens,
      maximumInputTokens,
      settings
    })

    await expect(countTokens(result.prompt)).resolves.toBeLessThanOrEqual(
      maximumInputTokens - MODEL_PROMPT_TOKEN_HEADROOM_COUNT
    )
    expect(result.includedDiffLengthCharacters).toBeGreaterThan(0)
    expect(result.includedDiffLengthCharacters).toBeLessThan(context.diff.length)
    expect(result.truncated).toBe(true)
  })

  test('keeps the complete diff when it fits', async () => {
    const smallContext = {
      ...context,
      diff: 'one small change'
    }
    const result = await fitPullRequestPrompt({
      context: smallContext,
      countTokens,
      maximumInputTokens: 10_000,
      settings
    })

    expect(result.includedDiffLengthCharacters).toBe(smallContext.diff.length)
    expect(result.prompt).toContain(smallContext.diff)
    expect(result.truncated).toBe(false)
  })
})
