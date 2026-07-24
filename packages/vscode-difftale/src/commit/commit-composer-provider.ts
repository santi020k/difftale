import {
  formatConventionalCommit,
  type GitRepository,
  validateConventionalCommit,
} from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { fitCommitPrompt } from '../ai/fit-commit-prompt'
import { parseAiDrafts } from '../ai/parse-ai-drafts'
import { getCommitProjectContext } from '../commit-project-context'
import {
  COMMIT_DRAFT_STORAGE_KEY,
  COMMIT_STATUS_REFRESH_INTERVAL_MILLISECONDS,
} from '../constants'
import { resolveRepositoryPath } from '../repository-resolver'
import type {
  CommitDraft,
  GitCommitResult,
  GitFailurePresentation,
} from '../types'
import { createNonce } from '../utils/create-nonce'
import { getCommitGenerationSettings } from '../utils/get-commit-generation-settings'
import { getString } from '../utils/get-string'
import { isRecord } from '../utils/is-record'

import { getCommitComposerHtml } from './get-commit-composer-html'

interface CommitComposerProviderOptions {
  commit: (repositoryPath: string, message: string) => Promise<GitCommitResult>
  extensionContext: vscode.ExtensionContext
  repository: GitRepository
}

interface CommitComposerMessage {
  description?: string
  paths?: string[]
  title?: string
  type: string
}

const EMPTY_DRAFT: CommitDraft = { description: '', title: '' }

const parseMessage = (value: unknown): CommitComposerMessage | undefined => {
  if (!isRecord(value)) return undefined

  const type = getString(value, 'type')

  return type
    ? {
        description: getString(value, 'description'),
        paths: Array.isArray(value.paths)
          ? value.paths.filter(filePath => typeof filePath === 'string')
          : undefined,
        title: getString(value, 'title'),
        type,
      }
    : undefined
}

export class CommitComposerProvider implements vscode.WebviewViewProvider {
  readonly #commit: CommitComposerProviderOptions['commit']
  readonly #extensionContext: vscode.ExtensionContext
  readonly #repository: GitRepository
  #failure: GitFailurePresentation | undefined
  #view: vscode.WebviewView | undefined

  public constructor(options: CommitComposerProviderOptions) {
    this.#commit = options.commit

    this.#extensionContext = options.extensionContext

    this.#repository = options.repository
  }

  public resolveWebviewView = (view: vscode.WebviewView): void => {
    this.#view = view

    view.webview.options = { enableScripts: true }

    view.webview.html = getCommitComposerHtml(
      view.webview.cspSource,
      createNonce(),
      COMMIT_STATUS_REFRESH_INTERVAL_MILLISECONDS,
    )

    view.webview.onDidReceiveMessage(value => this.#handleMessage(value))
  }

  async #handleMessage(value: unknown): Promise<void> {
    const message = parseMessage(value)

    if (!message) return

    if (await this.#handleComposerAction(message)) return

    if (await this.#handleUtilityAction(message)) return

    if (message.type === 'commit') {
      await this.#commitDraft({
        description: message.description?.trim() ?? '',
        title: message.title?.trim() ?? '',
      })
    }
  }

  async #handleUtilityAction(message: CommitComposerMessage): Promise<boolean> {
    if (message.type === 'showGitOutput') {
      await vscode.commands.executeCommand('difftale.showGitOutput')

      return true
    }

    if (message.type === 'push') {
      await this.#push()

      return true
    }

    if (message.type === 'copyGitFailure') {
      await this.#copyFailure()

      return true
    }

    return false
  }

  async #handleComposerAction(message: CommitComposerMessage): Promise<boolean> {
    if (await this.#handleStagingAction(message)) return true

    if (message.type === 'ready') {
      await this.#sendDraft(this.#getDraft())

      await this.#refresh(true)

      return true
    }

    if (message.type === 'draftChanged') {
      await this.#saveDraft({
        description: message.description ?? '',
        title: message.title ?? '',
      })

      return true
    }

    if (message.type === 'refresh') {
      await this.#refresh()

      return true
    }

    if (message.type === 'generate') {
      await this.#generate()

      return true
    }

    return false
  }

  async #handleStagingAction(message: CommitComposerMessage): Promise<boolean> {
    if (message.type === 'stageFiles') {
      await this.#updateStaging('stage', message.paths ?? [])

      return true
    }

    if (message.type === 'unstageFiles') {
      await this.#updateStaging('unstage', message.paths ?? [])

      return true
    }

    return false
  }

  #getDraft(): CommitDraft {
    return (
      this.#extensionContext.workspaceState.get<CommitDraft>(
        COMMIT_DRAFT_STORAGE_KEY,
      ) ?? EMPTY_DRAFT
    )
  }

  async #saveDraft(draft: CommitDraft): Promise<void> {
    await this.#extensionContext.workspaceState.update(COMMIT_DRAFT_STORAGE_KEY, draft)
  }

  async #post(message: Record<string, unknown>): Promise<void> {
    await this.#view?.webview.postMessage(message)
  }

  async #sendDraft(draft: CommitDraft): Promise<void> {
    await this.#post({ ...draft, type: 'draft' })
  }

  async #copyFailure(): Promise<void> {
    if (!this.#failure) return

    await vscode.env.clipboard.writeText(
      [
        this.#failure.title,
        this.#failure.summary,
        '',
        this.#failure.details,
      ].join('\n'),
    )

    await this.#status('Error details copied.', 'success')
  }

  async #status(
    text: string,
    kind: 'error' | 'info' | 'success' | 'warning' = 'info',
  ): Promise<void> {
    await this.#post({ kind, text, type: 'status' })
  }

  async #getRepositoryPath(): Promise<string | undefined> {
    const repositoryPath = await resolveRepositoryPath(this.#repository)

    if (!repositoryPath) {
      await this.#status('Difftale could not find a Git repository.', 'error')
    }

    return repositoryPath
  }

  async #refresh(announce = false): Promise<void> {
    const repositoryPath = await this.#getRepositoryPath()

    if (!repositoryPath) return

    const [stagedFilePaths, unstagedFilePaths, branchSyncStatus] = await Promise.all([
      this.#repository.getStagedFilePaths(repositoryPath),
      this.#repository.getUnstagedFilePaths(repositoryPath),
      this.#repository.getBranchSyncStatus(repositoryPath),
    ])

    const settings = getCommitGenerationSettings()

    await this.#post({
      ...branchSyncStatus,
      maximumHeaderLengthCharacters: settings.maximumHeaderLengthCharacters,
      stagedCount: stagedFilePaths.length,
      stagedFilePaths,
      type: 'context',
      unstagedFilePaths,
    })

    if (announce) {
      await this.#status(
        stagedFilePaths.length > 0
          ? 'Ready to generate or commit the staged changes.'
          : 'Choose changes below to include in the commit.',
        stagedFilePaths.length > 0 ? 'success' : 'info',
      )
    }
  }

  async #push(): Promise<void> {
    await this.#post({ type: 'busy', value: true })

    try {
      await vscode.commands.executeCommand('difftale.push')

      await this.#refresh()
    } finally {
      await this.#post({ type: 'busy', value: false })
    }
  }

  async #updateStaging(
    action: 'stage' | 'unstage',
    filePaths: readonly string[],
  ): Promise<void> {
    if (filePaths.length === 0) return

    const repositoryPath = await this.#getRepositoryPath()

    if (!repositoryPath) return

    await this.#post({ type: 'busy', value: true })

    try {
      await (action === 'stage' ? this.#repository.stageFiles(repositoryPath, filePaths) : this.#repository.unstageFiles(repositoryPath, filePaths));

      await vscode.commands.executeCommand('git.refresh')

      await this.#refresh()

      await this.#status(
        `${filePaths.length} ${filePaths.length === 1 ? 'file' : 'files'} ${
          action === 'stage' ? 'staged' : 'unstaged'
        }.`,
        'success',
      )
    } catch (error) {
      await this.#status(
        error instanceof Error
          ? error.message
          : `Git could not ${action} the changes.`,
        'error',
      )
    } finally {
      await this.#post({ type: 'busy', value: false })
    }
  }

  async #generate(): Promise<void> {
    const repositoryPath = await this.#getRepositoryPath()

    if (!repositoryPath) return

    await this.#post({ type: 'busy', value: true })

    await this.#status('Generating from staged changes…')

    try {
      const diff = await this.#repository.getStagedDiff(repositoryPath)

      if (!diff.trim()) {
        await this.#status('Stage changes before generating a commit.', 'warning')

        return
      }

      const draft = await this.#requestDraft(repositoryPath, diff)

      if (!draft) return

      await this.#saveDraft(draft)

      await this.#sendDraft(draft)

      await this.#status('Commit draft generated from staged changes.', 'success')
    } catch (error) {
      await this.#status(
        error instanceof Error ? error.message : 'Commit generation failed.',
        'error',
      )
    } finally {
      await this.#post({ type: 'busy', value: false })
    }
  }

  async #requestDraft(
    repositoryPath: string,
    diff: string,
  ): Promise<CommitDraft | undefined> {
    const baseSettings = getCommitGenerationSettings()
    const settings = { ...baseSettings, draftCount: 1 }

    const models = await vscode.lm.selectChatModels({
      family: settings.modelFamily,
      vendor: 'copilot',
    })

    const model = models[0]

    if (!model) {
      await this.#status('No VS Code language model is available.', 'error')

      return undefined
    }

    const cancellationTokenSource = new vscode.CancellationTokenSource()

    try {
      const context = await getCommitProjectContext(this.#repository, repositoryPath)

      const prompt = await fitCommitPrompt({
        context,
        countTokens: text => model.countTokens(text, cancellationTokenSource.token),
        diff,
        maximumInputTokens: model.maxInputTokens,
        settings,
      })

      const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)],
        {},
        cancellationTokenSource.token,
      )

      let responseText = ''

      for await (const fragment of response.text) responseText += fragment

      const commit = parseAiDrafts(responseText)[0]
      const message = commit ? formatConventionalCommit(commit) : ''

      if (!commit || !validateConventionalCommit(message, settings).valid) {
        await this.#status('The model returned an invalid commit draft.', 'error')

        return undefined
      }

      return {
        description: commit.body ?? '',
        title: message.split('\n')[0] ?? '',
      }
    } finally {
      cancellationTokenSource.dispose()
    }
  }

  async #commitDraft(draft: CommitDraft): Promise<void> {
    const repositoryPath = await this.#getRepositoryPath()

    if (!repositoryPath) return

    const message = [draft.title, draft.description].filter(Boolean).join('\n\n')

    await this.#post({ type: 'busy', value: true })

    try {
      this.#failure = undefined

      await this.#post({ type: 'clearCommitFailure' })

      const result = await this.#commit(repositoryPath, message)

      if (result.succeeded) {
        await this.#saveDraft(EMPTY_DRAFT)

        await this.#sendDraft(EMPTY_DRAFT)

        await this.#refresh()

        await this.#status('Commit completed.', 'success')
      } else if (result.failure) {
        this.#failure = result.failure

        await this.#post({
          ...result.failure,
          type: 'commitFailure',
        })
      }
    } finally {
      await this.#post({ type: 'busy', value: false })
    }
  }
}
