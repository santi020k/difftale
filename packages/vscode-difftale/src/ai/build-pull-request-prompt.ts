import type {
  CommitGenerationSettings,
  PullRequestGenerationContext,
} from '../types'

interface BuildPullRequestPromptOptions {
  context: PullRequestGenerationContext
  settings: CommitGenerationSettings
}

export const buildPullRequestPrompt = ({
  context,
  settings,
}: BuildPullRequestPromptOptions): string => {
  const truncatedDiff = context.diff.slice(0, settings.maximumDiffLengthCharacters)

  const customInstructions =
    settings.customInstructions.length > 0
      ? settings.customInstructions.map(instruction => `- ${instruction}`).join('\n')
      : '- No additional instructions.'

  return [
    'Create a title and description for a GitHub pull request.',
    'Return strict JSON with this exact shape:',
    '{"title":"feat(checkout): preserve cart state","description":"## Summary\\n- Preserve cart state during redirects\\n\\n## Testing\\n- Add redirect coverage"}',
    `The title must follow Conventional Commits using one of: ${settings.allowedTypes.join(', ')}.`,
    `The title must be at most ${settings.maximumHeaderLengthCharacters} characters.`,
    'Use a lowercase imperative title without a trailing period.',
    'The description must use Markdown and include concise Summary and Testing sections.',
    'Describe behavior, motivation, and meaningful verification. Do not list every file.',
    'Do not invent tests. If verification is not evident, write "Not run (not provided)".',
    'Do not wrap the JSON in Markdown.',
    `Current branch: ${context.currentBranch}`,
    `Base branch: ${context.baseBranch}`,
    'Branch commit subjects:',
    context.commitSubjects.join('\n') || 'none',
    'Additional instructions:',
    customInstructions,
    'Pull request diff:',
    truncatedDiff,
  ].join('\n\n')
}
