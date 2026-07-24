import { basename } from 'node:path'

import { type GitRepository } from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { getCommitUrl } from './utils/get-commit-url'
import {
  STATUS_BAR_PRIORITY,
  WORKING_REVISION_LABEL,
} from './constants'
import { resolveRepositoryPath } from './repository-resolver'
import { type RevisionContentProvider } from './revision-content-provider'
import type { FileNavigationState, RevisionTarget } from './types'

interface HistoryQuickPickItem extends vscode.QuickPickItem {
  targetIndex: number
}

export class FileHistoryController implements vscode.Disposable {
  readonly #navigationStates = new Map<string, FileNavigationState>()
  readonly #provider: RevisionContentProvider
  readonly #repository: GitRepository
  readonly #statusBarItem: vscode.StatusBarItem

  public constructor(repository: GitRepository, provider: RevisionContentProvider) {
    this.#repository = repository

    this.#provider = provider

    this.#statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      STATUS_BAR_PRIORITY,
    )

    this.#statusBarItem.command = 'difftale.showFileHistory'

    this.#statusBarItem.name = 'Difftale Revision'
  }

  public compareWithWorking = async (resourceUri?: vscode.Uri): Promise<void> => {
    const absoluteFilePath = this.#resolveFilePath(resourceUri)

    if (!absoluteFilePath) {
      return
    }

    const state = await this.#loadState(absoluteFilePath)
    const headTarget = state?.targets.find(target => target.kind === 'git')

    if (!state || !headTarget) {
      await vscode.window.showInformationMessage('This file does not have committed history.')

      return
    }

    const headUri = this.#getTargetUri(state, headTarget)

    await vscode.commands.executeCommand(
      'vscode.diff',
      headUri,
      vscode.Uri.file(absoluteFilePath),
      `${basename(absoluteFilePath)} · ${headTarget.label} ↔ ${WORKING_REVISION_LABEL}`,
      { preview: true },
    )
  }

  public dispose = (): void => {
    this.#statusBarItem.dispose()
  }

  public copyRevisionHash = async (commitHash: string): Promise<void> => {
    await vscode.env.clipboard.writeText(commitHash)

    await vscode.window.showInformationMessage(
      `Copied commit ${commitHash.slice(0, 12)}.`,
    )
  }

  public openRevisionOnRemote = async (
    absoluteFilePath: string,
    commitHash: string,
  ): Promise<void> => {
    const repositoryPath = await resolveRepositoryPath(
      this.#repository,
      vscode.Uri.file(absoluteFilePath),
    )

    if (!repositoryPath) {
      await vscode.window.showErrorMessage('Difftale could not find a Git repository.')

      return
    }

    const remoteUrl = await this.#repository.getRemoteUrl(repositoryPath)
    const commitUrl = remoteUrl ? getCommitUrl(remoteUrl, commitHash) : undefined

    if (!commitUrl) {
      await vscode.window.showWarningMessage(
        'Difftale could not determine a web URL for this repository.',
      )

      return
    }

    await vscode.env.openExternal(vscode.Uri.parse(commitUrl))
  }

  public getNavigationState = async (
    resourceUri?: vscode.Uri,
    silent = false,
  ): Promise<FileNavigationState | undefined> => {
    const absoluteFilePath = this.#resolveFilePath(resourceUri)

    return absoluteFilePath
      ? this.#loadState(absoluteFilePath, true, silent)
      : undefined
  }

  public newer = async (resourceUri?: vscode.Uri): Promise<void> => {
    const absoluteFilePath = this.#resolveFilePath(resourceUri)

    if (!absoluteFilePath) {
      return
    }

    const state =
      this.#navigationStates.get(absoluteFilePath) ?? (await this.#loadState(absoluteFilePath))

    if (!state || state.selectedIndex < 0) {
      await vscode.window.showInformationMessage('Open an older revision first.')

      return
    }

    if (state.selectedIndex === 0) {
      state.selectedIndex = -1

      this.#statusBarItem.hide()

      await vscode.window.showTextDocument(vscode.Uri.file(absoluteFilePath), {
        preview: true,
      })

      return
    }

    state.selectedIndex -= 1

    await this.#openSelectedChange(state)
  }

  public older = async (resourceUri?: vscode.Uri): Promise<void> => {
    const absoluteFilePath = this.#resolveFilePath(resourceUri)

    if (!absoluteFilePath) {
      return
    }

    const state =
      this.#navigationStates.get(absoluteFilePath) ?? (await this.#loadState(absoluteFilePath))

    if (!state || state.targets.length === 0) {
      await vscode.window.showInformationMessage('This file does not have committed history.')

      return
    }

    const nextIndex = state.selectedIndex + 1

    if (nextIndex >= state.targets.length) {
      await vscode.window.showInformationMessage('You reached the oldest revision of this file.')

      return
    }

    state.selectedIndex = nextIndex

    await this.#openSelectedChange(state)
  }

  public openAtIndex = async (
    resourceUri: vscode.Uri,
    targetIndex: number,
  ): Promise<void> => {
    const state = await this.getNavigationState(resourceUri)
    const target = state?.targets[targetIndex]

    if (!state || !target) {
      await vscode.window.showInformationMessage('That file revision is no longer available.')

      return
    }

    state.selectedIndex = targetIndex

    await this.#openSelectedChange(state)
  }

  public showHistory = async (resourceUri?: vscode.Uri): Promise<void> => {
    const absoluteFilePath = this.#resolveFilePath(resourceUri)

    if (!absoluteFilePath) {
      return
    }

    const state = await this.#loadState(absoluteFilePath, true)

    if (!state || state.targets.length === 0) {
      await vscode.window.showInformationMessage('This file does not have committed history.')

      return
    }

    const items: HistoryQuickPickItem[] = state.targets.map((target, targetIndex) => {
      const revision = target.revision

      return {
        description: revision
          ? `${revision.author} · ${new Date(revision.authoredAt).toLocaleString()}`
          : 'Uncommitted changes',
        detail: revision
          ? `${revision.shortHash}${revision.body ? ` · ${revision.body}` : ''}`
          : absoluteFilePath,
        label: target.kind === 'working' ? '$(edit) Working Tree' : `$(git-commit) ${target.label}`,
        targetIndex,
      }
    })

    const selectedItem = await vscode.window.showQuickPick(items, {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Search commits that changed this file',
      title: `Difftale: ${basename(absoluteFilePath)} History`,
    })

    if (!selectedItem) {
      return
    }

    state.selectedIndex = selectedItem.targetIndex

    await this.#openSelectedChange(state)
  }

  #getTargetUri(state: FileNavigationState, target: RevisionTarget): vscode.Uri {
    if (target.kind === 'working') {
      return vscode.Uri.file(state.absoluteFilePath)
    }

    if (target.kind === 'empty' || !target.revision) {
      return this.#provider.createEmptyUri(state.absoluteFilePath, state.repositoryPath)
    }

    return this.#provider.createRevisionUri(
      state.absoluteFilePath,
      state.repositoryPath,
      target.revision,
    )
  }

  async #loadState(
    absoluteFilePath: string,
    forceReload = false,
    silent = false,
  ): Promise<FileNavigationState | undefined> {
    if (!forceReload) {
      const existingState = this.#navigationStates.get(absoluteFilePath)

      if (existingState) {
        return existingState
      }
    }

    const repositoryPath = await resolveRepositoryPath(
      this.#repository,
      vscode.Uri.file(absoluteFilePath),
    )

    if (!repositoryPath) {
      await this.#showLoadError('Difftale could not find a Git repository.', silent)

      return undefined
    }

    try {
      const history = await this.#repository.getFileHistory(repositoryPath, absoluteFilePath)

      const hasWorkingChanges = await this.#repository.hasWorkingChanges(
        repositoryPath,
        absoluteFilePath,
      )

      const targets: RevisionTarget[] = [
        ...(hasWorkingChanges
          ? [
              {
                filePath: absoluteFilePath,
                kind: 'working',
                label: WORKING_REVISION_LABEL,
              } satisfies RevisionTarget,
            ]
          : []),
        ...history.map(revision => ({
          filePath: revision.filePath,
          kind: 'git',
          label: `${revision.shortHash} · ${revision.subject}`,
          revision,
        }) satisfies RevisionTarget),
      ]

      const state: FileNavigationState = {
        absoluteFilePath,
        repositoryPath,
        selectedIndex: -1,
        targets,
      }

      this.#navigationStates.set(absoluteFilePath, state)

      return state
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Git history could not be read.'

      await this.#showLoadError(`Difftale could not load file history: ${message}`, silent)

      return undefined
    }
  }

  async #openSelectedChange(state: FileNavigationState): Promise<void> {
    const rightTarget = state.targets[state.selectedIndex]

    if (!rightTarget) {
      return
    }

    const leftTarget =
      state.targets[state.selectedIndex + 1] ??
      ({
        filePath: rightTarget.filePath,
        kind: 'empty',
        label: 'File Creation',
      } satisfies RevisionTarget)

    const leftUri = this.#getTargetUri(state, leftTarget)
    const rightUri = this.#getTargetUri(state, rightTarget)

    await vscode.commands.executeCommand(
      'vscode.diff',
      leftUri,
      rightUri,
      `${basename(state.absoluteFilePath)} · ${leftTarget.label} ↔ ${rightTarget.label}`,
      { preview: true },
    )

    this.#statusBarItem.text = `$(history) ${state.selectedIndex + 1}/${state.targets.length}`

    this.#statusBarItem.tooltip = `${rightTarget.label}\nClick to search file history`

    this.#statusBarItem.show()
  }

  async #showLoadError(message: string, silent: boolean): Promise<void> {
    if (!silent) {
      await vscode.window.showErrorMessage(message)
    }
  }

  #resolveFilePath(resourceUri?: vscode.Uri): string | undefined {
    const uri = resourceUri ?? vscode.window.activeTextEditor?.document.uri

    if (!uri) {
      return undefined
    }

    if (uri.scheme === 'file') {
      return uri.fsPath
    }

    const originalFilePath = this.#provider.getOriginalFilePath(uri)

    return originalFilePath
  }
}
