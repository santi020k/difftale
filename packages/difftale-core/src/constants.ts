export const DEFAULT_HEADER_LENGTH_CHARACTERS = 72
export const GIT_EXECUTION_BUFFER_BYTES = 16 * 1024 * 1024
export const GIT_FIELD_SEPARATOR = '\u001f'
export const GIT_RECORD_SEPARATOR = '\u001e'
export const RECENT_COMMIT_LIMIT_COUNT = 20

export const DEFAULT_COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
] as const
