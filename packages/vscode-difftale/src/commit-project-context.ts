import type { GitRepository } from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { getScopeFromPaths } from './utils/get-scope-from-paths'
import { MAXIMUM_SCOPE_SUGGESTION_COUNT } from './constants'
import type { CommitProjectContext } from './types'

const COMMIT_CONFIGURATION_PATTERN =
  '**/{commitlint.config.js,commitlint.config.cjs,commitlint.config.mjs,commitlint.config.ts,.commitlintrc,.commitlintrc.json,.commitlintrc.yaml,.commitlintrc.yml}'

const CONVENTIONAL_HEADER_PATTERN = /^[a-z][a-z0-9-]*\((?<scope>[^)]+)\)(?:!)?: /

export const getCommitProjectContext = async (
  repository: GitRepository,
  repositoryPath: string
): Promise<CommitProjectContext> => {
  const recentSubjects = await repository.getRecentCommitSubjects(repositoryPath)
  const stagedFilePaths = await repository.getStagedFilePaths(repositoryPath)
  const stagedScope = getScopeFromPaths(stagedFilePaths)

  const suggestedScopes = [
    ...new Set(
      [
        stagedScope,
        ...recentSubjects.map(
          subject => CONVENTIONAL_HEADER_PATTERN.exec(subject)?.groups?.scope
        )
      ].filter(scope => scope !== undefined)
    )
  ].slice(0, MAXIMUM_SCOPE_SUGGESTION_COUNT)

  const configurationUris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(repositoryPath, COMMIT_CONFIGURATION_PATTERN), '**/node_modules/**'
  )

  const configurationFiles = configurationUris.map(uri => vscode.workspace.asRelativePath(uri, false))

  return {
    configurationFiles: [...new Set(configurationFiles)],
    recentSubjects,
    suggestedScopes
  }
}
