import * as vscode from 'vscode'

interface GitApiRepository {
  inputBox: {
    value: string
  }
  rootUri: vscode.Uri
  state: {
    onDidChange: vscode.Event<void>
  }
}

interface GitApi {
  onDidCloseRepository: vscode.Event<GitApiRepository>
  onDidOpenRepository: vscode.Event<GitApiRepository>
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

export const getGitRepositoryPaths = async (): Promise<string[]> => {
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')

  if (!gitExtension) {
    return []
  }

  const exports = gitExtension.isActive
    ? gitExtension.exports
    : await gitExtension.activate()

  return exports.getAPI(1).repositories.map(repository => repository.rootUri.fsPath)
}

export const watchGitRepositories = async (
  listener: () => void,
): Promise<vscode.Disposable> => {
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')

  if (!gitExtension) {
    return vscode.Disposable.from()
  }

  const exports = gitExtension.isActive
    ? gitExtension.exports
    : await gitExtension.activate()

  const api = exports.getAPI(1)
  const repositorySubscriptions = new Map<string, vscode.Disposable>()

  const subscribe = (repository: GitApiRepository): void => {
    repositorySubscriptions.get(repository.rootUri.fsPath)?.dispose()

    repositorySubscriptions.set(
      repository.rootUri.fsPath,
      repository.state.onDidChange(listener),
    )
  }

  for (const repository of api.repositories) {
    subscribe(repository)
  }

  const openSubscription = api.onDidOpenRepository(repository => {
    subscribe(repository)

    listener()
  })

  const closeSubscription = api.onDidCloseRepository(repository => {
    repositorySubscriptions.get(repository.rootUri.fsPath)?.dispose()

    repositorySubscriptions.delete(repository.rootUri.fsPath)

    listener()
  })

  return new vscode.Disposable(() => {
    openSubscription.dispose()

    closeSubscription.dispose()

    for (const subscription of repositorySubscriptions.values()) {
      subscription.dispose()
    }
  })
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
