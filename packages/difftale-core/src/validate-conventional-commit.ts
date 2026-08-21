import { DEFAULT_COMMIT_TYPES, DEFAULT_HEADER_LENGTH_CHARACTERS } from './constants.js'
import { parseConventionalCommit } from './parse-conventional-commit.js'
import type {
  CommitValidationOptions,
  CommitValidationResult,
  ConventionalCommit
} from './types.js'

const getCommitErrors = (
  parsedCommit: ConventionalCommit,
  header: string,
  allowedTypes: readonly string[],
  maximumHeaderLengthCharacters: number
): string[] => {
  const errors: string[] = []

  if (!allowedTypes.includes(parsedCommit.type)) {
    errors.push(`Type "${parsedCommit.type}" is not allowed.`)
  }

  if (header.length > maximumHeaderLengthCharacters) {
    errors.push(`Header exceeds ${maximumHeaderLengthCharacters} characters.`)
  }

  if (parsedCommit.summary.endsWith('.')) {
    errors.push('Summary must not end with a period.')
  }

  const firstCharacter = parsedCommit.summary[0]

  if (firstCharacter && !parsedCommit.summary.startsWith(firstCharacter.toLowerCase())) {
    errors.push('Summary must begin with a lowercase character.')
  }

  if (parsedCommit.breaking && !parsedCommit.footer?.startsWith('BREAKING CHANGE:')) {
    errors.push('Breaking commits must include a BREAKING CHANGE footer.')
  }

  return errors
}

export const validateConventionalCommit = (
  message: string,
  options: CommitValidationOptions = {}
): CommitValidationResult => {
  const parsedCommit = parseConventionalCommit(message)

  if (!parsedCommit) {
    return {
      errors: ['Use the format type(optional-scope): summary.'],
      valid: false
    }
  }

  const allowedTypes = options.allowedTypes ?? DEFAULT_COMMIT_TYPES

  const maximumHeaderLengthCharacters =
    options.maximumHeaderLengthCharacters ?? DEFAULT_HEADER_LENGTH_CHARACTERS

  const [header = ''] = message.replaceAll('\r\n', '\n').split('\n')

  const errors = getCommitErrors(
    parsedCommit, header, allowedTypes, maximumHeaderLengthCharacters
  )

  return {
    errors,
    valid: errors.length === 0
  }
}
