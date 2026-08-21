import { dirname } from 'node:path'

import type { GitRepository } from '@santi020k/difftale-core'

import * as vscode from 'vscode'

const getCandidateUri = (resourceUri?: vscode.Uri): vscode.Uri | undefined => [
  resourceUri,
  vscode.window.activeTextEditor?.document.uri,
  vscode.workspace.workspaceFolders?.[0]?.uri
].find(candidateUri => candidateUri?.scheme === 'file')

export const resolveRepositoryPath = async (
  repository: GitRepository,
  resourceUri?: vscode.Uri
): Promise<string | undefined> => {
  const candidateUri = getCandidateUri(resourceUri)

  if (candidateUri?.scheme !== 'file') {
    return undefined
  }

  const workspaceFolderPath = vscode.workspace.getWorkspaceFolder(candidateUri)?.uri.fsPath

  const candidatePath =
    candidateUri.fsPath === workspaceFolderPath ?
      candidateUri.fsPath :
      dirname(candidateUri.fsPath)

  try {
    return await repository.findRoot(candidatePath)
  } catch {
    return undefined
  }
}
