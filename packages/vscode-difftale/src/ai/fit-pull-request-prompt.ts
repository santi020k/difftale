import {
  MODEL_PROMPT_TOKEN_HEADROOM_COUNT,
  PROMPT_BUDGET_SEARCH_ITERATION_LIMIT_COUNT,
} from '../constants'
import type {
  CommitGenerationSettings,
  PullRequestGenerationContext,
} from '../types'

import { buildPullRequestPrompt } from './build-pull-request-prompt'

interface FitPullRequestPromptOptions {
  context: PullRequestGenerationContext
  countTokens: (prompt: string) => PromiseLike<number>
  maximumInputTokens: number
  settings: CommitGenerationSettings
}

export interface FittedPullRequestPrompt {
  includedDiffLengthCharacters: number
  prompt: string
  truncated: boolean
}

const buildPromptWithDiffLength = (
  context: PullRequestGenerationContext,
  settings: CommitGenerationSettings,
  diffLengthCharacters: number,
): string =>
  buildPullRequestPrompt({
    context: {
      ...context,
      diff: context.diff.slice(0, diffLengthCharacters),
    },
    settings,
  })

export const fitPullRequestPrompt = async ({
  context,
  countTokens,
  maximumInputTokens,
  settings,
}: FitPullRequestPromptOptions): Promise<FittedPullRequestPrompt> => {
  const tokenBudget = maximumInputTokens - MODEL_PROMPT_TOKEN_HEADROOM_COUNT

  const maximumDiffLengthCharacters = Math.min(
    context.diff.length,
    settings.maximumDiffLengthCharacters,
  )

  const promptWithoutDiff = buildPromptWithDiffLength(context, settings, 0)
  const promptWithoutDiffTokens = await countTokens(promptWithoutDiff)

  if (promptWithoutDiffTokens > tokenBudget) {
    throw new Error('The project context exceeds the selected model token limit.')
  }

  let lowerDiffLengthCharacters = 0
  let upperDiffLengthCharacters = maximumDiffLengthCharacters
  let fittedPrompt = promptWithoutDiff
  let includedDiffLengthCharacters = 0
  let iterationCount = 0

  while (
    lowerDiffLengthCharacters <= upperDiffLengthCharacters &&
    iterationCount < PROMPT_BUDGET_SEARCH_ITERATION_LIMIT_COUNT
  ) {
    const candidateDiffLengthCharacters = Math.floor(
      (lowerDiffLengthCharacters + upperDiffLengthCharacters) / 2,
    )

    const candidatePrompt = buildPromptWithDiffLength(
      context,
      settings,
      candidateDiffLengthCharacters,
    )

    const candidateTokenCount = await countTokens(candidatePrompt)

    if (candidateTokenCount <= tokenBudget) {
      fittedPrompt = candidatePrompt

      includedDiffLengthCharacters = candidateDiffLengthCharacters

      lowerDiffLengthCharacters = candidateDiffLengthCharacters + 1
    } else {
      upperDiffLengthCharacters = candidateDiffLengthCharacters - 1
    }

    iterationCount += 1
  }

  return {
    includedDiffLengthCharacters,
    prompt: fittedPrompt,
    truncated: includedDiffLengthCharacters < context.diff.length,
  }
}
