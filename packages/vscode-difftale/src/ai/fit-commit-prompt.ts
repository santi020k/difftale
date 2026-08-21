import {
  MODEL_PROMPT_TOKEN_HEADROOM_COUNT,
  PROMPT_BUDGET_SEARCH_ITERATION_LIMIT_COUNT
} from '../constants'
import type { CommitGenerationSettings, CommitProjectContext } from '../types'
import { fitDiffToCharacterLimit } from '../utils/fit-diff-to-character-limit'

import { buildCommitPrompt } from './build-commit-prompt'

interface FitCommitPromptOptions {
  context: CommitProjectContext
  countTokens: (prompt: string) => PromiseLike<number>
  diff: string
  maximumInputTokens: number
  settings: CommitGenerationSettings
}

export const fitCommitPrompt = async ({
  context,
  countTokens,
  diff,
  maximumInputTokens,
  settings
}: FitCommitPromptOptions): Promise<string> => {
  const tokenBudget = maximumInputTokens - MODEL_PROMPT_TOKEN_HEADROOM_COUNT
  let lowerLengthCharacters = 0

  let upperLengthCharacters = Math.min(
    diff.length, settings.maximumDiffLengthCharacters
  )

  let fittedPrompt = buildCommitPrompt({ context, diff: '', settings })
  let iterationCount = 0

  if (await countTokens(fittedPrompt) > tokenBudget) {
    throw new Error('The project context exceeds the selected model token limit.')
  }

  while (
    lowerLengthCharacters <= upperLengthCharacters &&
    iterationCount < PROMPT_BUDGET_SEARCH_ITERATION_LIMIT_COUNT
  ) {
    const candidateLengthCharacters = Math.floor(
      (lowerLengthCharacters + upperLengthCharacters) / 2
    )

    const candidatePrompt = buildCommitPrompt({
      context,
      diff: fitDiffToCharacterLimit(diff, candidateLengthCharacters),
      settings
    })

    if (await countTokens(candidatePrompt) <= tokenBudget) {
      fittedPrompt = candidatePrompt

      lowerLengthCharacters = candidateLengthCharacters + 1
    } else {
      upperLengthCharacters = candidateLengthCharacters - 1
    }

    iterationCount += 1
  }

  return fittedPrompt
}
