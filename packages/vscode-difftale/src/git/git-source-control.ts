import * as vscode from 'vscode'

interface GitApiRepository {
  inputBox: {
    value: string
  }
  rootUri: vscode.Uri
}

interface GitApi {
  repositories: GitApiRepository[]
}

interface GitExtension {
  getAPI(version: number): GitApi
}

const getGitApiRepository = async (
  repositoryPath: string,
): Promise<GitApiRepository | undefined> => {
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')

  if (!gitExtension) {
    return undefined
  }

  const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate()

  return exports
    .getAPI(1)
    .repositories.find(candidate => candidate.rootUri.fsPath === repositoryPath)
}

export const getGitInputMessage = async (
  repositoryPath: string,
): Promise<string | undefined> => {
  const repository = await getGitApiRepository(repositoryPath)

  return repository?.inputBox.value
}

export const setGitInputMessage = async (
  repositoryPath: string,
  message: string,
): Promise<boolean> => {
  const repository = await getGitApiRepository(repositoryPath)

  if (!repository) {
    return false
  }

  repository.inputBox.value = message

  return true
}
