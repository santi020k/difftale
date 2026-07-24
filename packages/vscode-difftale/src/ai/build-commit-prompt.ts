import type { CommitGenerationSettings, CommitProjectContext } from '../types'
import {
  fitDiffToCharacterLimit,
  getDiffFilePaths,
} from '../utils/fit-diff-to-character-limit'

interface BuildCommitPromptOptions {
  context: CommitProjectContext
  diff: string
  settings: CommitGenerationSettings
}

export const buildCommitPrompt = ({
  context,
  diff,
  settings,
}: BuildCommitPromptOptions): string => {
  const truncatedDiff = fitDiffToCharacterLimit(
    diff,
    settings.maximumDiffLengthCharacters,
  )

  const changedFilePaths = getDiffFilePaths(diff)

  const customInstructions =
    settings.customInstructions.length > 0
      ? settings.customInstructions.map(instruction => `- ${instruction}`).join('\n')
      : '- No additional instructions.'

  return [
    'Create alternative Conventional Commit drafts for the staged Git diff.',
    `Return exactly ${settings.draftCount} drafts as strict JSON with this shape:`,
    '{"drafts":[{"type":"feat","scope":"checkout","summary":"preserve cart state","body":"Explain what changed and why.","footer":"","breaking":false}]}',
    `Allowed types: ${settings.allowedTypes.join(', ')}`,
    `Maximum header length: ${settings.maximumHeaderLengthCharacters} characters.`,
    'Use lowercase imperative summaries without a trailing period.',
    'Use a short feature or package scope when one is clear.',
    'Write a concise body that explains behavior and motivation, not a file inventory.',
    'Use an empty string for absent scope, body, or footer.',
    'Do not wrap the JSON in Markdown.',
    `Suggested scopes: ${context.suggestedScopes.join(', ') || 'none'}`,
    `Detected commit configuration: ${context.configurationFiles.join(', ') || 'none'}`,
    'Recent commit subjects:',
    context.recentSubjects.join('\n') || 'none',
    'Additional instructions:',
    customInstructions,
    'Changed files:',
    changedFilePaths.join('\n') || 'none',
    'Staged diff:',
    truncatedDiff,
  ].join('\n\n')
}
