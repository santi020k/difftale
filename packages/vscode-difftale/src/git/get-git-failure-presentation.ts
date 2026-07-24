import {
  GIT_FAILURE_DETAIL_LENGTH_LIMIT_CHARACTERS,
  GIT_FAILURE_DETAIL_LINE_LIMIT_COUNT,
} from '../constants'
import type {
  GitFailurePresentation,
  GitOperationRecord,
  GitOperationResult,
} from '../types'

interface GitFailureContext {
  hookNames: readonly string[]
  kind: GitOperationRecord['kind']
  result: GitOperationResult
}

const ANSI_ESCAPE_CHARACTER = '\u001B'
const ANSI_SEQUENCE_SUFFIX_PATTERN = /^\[[0-?]*[ -/]*[@-~]/u

const SPECIFIC_ERROR_PATTERN =
  /^(?:AssertionError|Error|RangeError|ReferenceError|SyntaxError|TypeError):/u

const FAILURE_WORD_PATTERN = /\b(?:error|failed|failure)\b/iu

const GENERIC_FAILURE_PATTERN =
  /^(?:ELIFECYCLE|Command failed with exit code|husky -|pre-(?:commit|push) hook exited)/iu

const COMMAND_OUTPUT_PATTERN = /^(?:\$|>|\s*at\s)/u

const removeAnsiSequences = (value: string): string =>
  value
    .split(ANSI_ESCAPE_CHARACTER)
    .map((segment, index) =>
      index === 0 ? segment : segment.replace(ANSI_SEQUENCE_SUFFIX_PATTERN, ''),
    )
    .join('')

const getOutputLines = (output: string): string[] =>
  removeAnsiSequences(output)
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(Boolean)

const getSummary = (lines: readonly string[], exitCode: number | null): string => {
  const specificError = lines.find(line => SPECIFIC_ERROR_PATTERN.test(line))

  if (specificError) return specificError

  const descriptiveFailure = lines.find(
    line => FAILURE_WORD_PATTERN.test(line) && !GENERIC_FAILURE_PATTERN.test(line),
  )

  if (descriptiveFailure) return descriptiveFailure

  const meaningfulLine = lines.find(
    line =>
      !COMMAND_OUTPUT_PATTERN.test(line) &&
      !GENERIC_FAILURE_PATTERN.test(line),
  )

  return meaningfulLine ?? `Git exited with code ${exitCode ?? 'unknown'}.`
}

const getDetails = (lines: readonly string[], summary: string): string => {
  const trailingLines = lines.slice(-GIT_FAILURE_DETAIL_LINE_LIMIT_COUNT)

  const detailLines = trailingLines.includes(summary)
    ? trailingLines
    : [summary, '…', ...trailingLines]

  return detailLines
    .join('\n')
    .slice(0, GIT_FAILURE_DETAIL_LENGTH_LIMIT_CHARACTERS)
}

export const getGitFailurePresentation = ({
  hookNames,
  kind,
  result,
}: GitFailureContext): GitFailurePresentation => {
  const lines = getOutputLines(result.output)
  const summary = getSummary(lines, result.exitCode)
  const operationLabel = kind === 'commit' ? 'Commit' : 'Push'

  const title =
    hookNames.length > 0
      ? `${operationLabel} blocked during ${hookNames.join(' and ')}`
      : `${operationLabel} failed`

  return {
    details: getDetails(lines, summary),
    summary,
    title,
  }
}
