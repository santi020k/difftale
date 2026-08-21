import { describe, expect, test } from 'vitest'

import { fitCommitPrompt } from '../src/ai/fit-commit-prompt'
import { MODEL_PROMPT_TOKEN_HEADROOM_COUNT } from '../src/constants'

const countTokens = (prompt: string): Promise<number> => Promise.resolve(Math.ceil(prompt.length / 4))

describe('fitCommitPrompt', () => {
  test('fits a large staged diff to the model input window', async () => {
    const maximumInputTokens = 1_000
    const prompt = await fitCommitPrompt({
      context: {
        configurationFiles: [],
        recentSubjects: ['feat(core): add composer'],
        suggestedScopes: ['core']
      },
      countTokens,
      diff: 'changed-line\n'.repeat(5_000),
      maximumInputTokens,
      settings: {
        allowedTypes: ['feat', 'fix'],
        customInstructions: [],
        draftCount: 1,
        maximumDiffLengthCharacters: 60_000,
        maximumHeaderLengthCharacters: 72
      }
    })

    await expect(countTokens(prompt)).resolves.toBeLessThanOrEqual(
      maximumInputTokens - MODEL_PROMPT_TOKEN_HEADROOM_COUNT
    )
  })
})
