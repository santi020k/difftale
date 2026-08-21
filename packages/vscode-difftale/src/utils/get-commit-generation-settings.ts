import {
  DEFAULT_COMMIT_TYPES,
  DEFAULT_HEADER_LENGTH_CHARACTERS
} from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import {
  DEFAULT_DRAFT_COUNT,
  DEFAULT_MAXIMUM_DIFF_LENGTH_CHARACTERS
} from '../constants'
import type { CommitGenerationSettings } from '../types'

export const getCommitGenerationSettings = (): CommitGenerationSettings => {
  const configuration = vscode.workspace.getConfiguration('difftale')
  const modelFamily = configuration.get<string>('modelFamily')?.trim()

  return {
    allowedTypes: configuration.get<string[]>('allowedTypes') ?? [...DEFAULT_COMMIT_TYPES],
    customInstructions: configuration.get<string[]>('customInstructions') ?? [],
    draftCount: configuration.get<number>('draftCount') ?? DEFAULT_DRAFT_COUNT,
    maximumDiffLengthCharacters:
      configuration.get<number>('maximumDiffLength') ??
      DEFAULT_MAXIMUM_DIFF_LENGTH_CHARACTERS,
    maximumHeaderLengthCharacters:
      configuration.get<number>('maximumHeaderLength') ??
      DEFAULT_HEADER_LENGTH_CHARACTERS,
    modelFamily: modelFamily || undefined
  }
}
