import {
  basename,
  isAbsolute,
  relative,
  resolve,
  sep as pathSeparator,
} from 'node:path'

import {
  formatConventionalCommit,
  type GitRepository,
  validateConventionalCommit,
} from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { fitCommitPrompt } from '../ai/fit-commit-prompt'
import { parseAiDrafts } from '../ai/parse-ai-drafts'
import { getCommitProjectContext } from '../commit-project-context'
import { COMMIT_DRAFT_STORAGE_KEY } from '../constants'
import { createFallbackCommit } from '../fallback-commit'
import { getGitRepositoryPaths } from '../git/git-source-control'
import { resolveRepositoryPath } from '../repository-resolver'
import type {
  CommitDraft,
  GitCommitResult,
  GitFailurePresentation,
} from '../types'
import { createNonce } from '../utils/create-nonce'
import { getCommitGenerationSettings } from '../utils/get-commit-generation-settings'
import { getRepositoryStorageKey } from '../utils/get-repository-storage-key'
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
  path?: string
  paths?: string[]
  title?: string
  type: string
}

interface GeneratedCommitDrafts {
  drafts: CommitDraft[]
  source: 'ai' | 'local'
  truncated: boolean
}

const EMPTY_DRAFT: CommitDraft = { description: '', title: '' }

const parseMessage = (value: unknown): CommitComposerMessage | undefined => {
  if (!isRecord(value)) return undefined

  const type = getString(value, 'type')

  return type
      ? {
        description: getString(value, 'description'),
        path: getString(value, 'path'),
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
  #activeRepositoryContext:
    | { branch: string; repositoryPath: string }
    | undefined

  #failure: GitFailurePresentation | undefined
  #selectedRepositoryPath: string | undefined
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
    )

    view.webview.onDidReceiveMessage(value => this.#handleMessage(value))
  }

  public refresh = async (): Promise<void> => {
    if (this.#view?.visible) {
      await this.#refresh()
    }
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
    if (message.type === 'openFile') {
      await this.#openFile(message.path)

      return true
    }

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

  async #openFile(filePath: string | undefined): Promise<void> {
    if (!filePath) return

    const context = await this.#getRepositoryContext()

    if (!context) return

    const { repositoryPath } = context
    const absoluteFilePath = resolve(repositoryPath, filePath)
    const relativeFilePath = relative(repositoryPath, absoluteFilePath)

    if (
      !relativeFilePath ||
      relativeFilePath === '..' ||
      relativeFilePath.startsWith(`..${pathSeparator}`) ||
      isAbsolute(relativeFilePath)
    ) {
      await this.#status('Difftale could not open that file.', 'error')

      return
    }

    try {
      await vscode.window.showTextDocument(vscode.Uri.file(absoluteFilePath), {
        preview: true,
      })
    } catch {
      await this.#status('That file no longer exists in the working tree.', 'warning')
    }
  }

  async #handleComposerAction(message: CommitComposerMessage): Promise<boolean> {
    if (await this.#handleStagingAction(message)) return true

    if (await this.#handleDraftAction(message)) return true

    if (message.type === 'ready') {
      await this.#refresh(true)

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

  async #handleDraftAction(message: CommitComposerMessage): Promise<boolean> {
    if (message.type === 'draftChanged') {
      const context =
        this.#activeRepositoryContext ??
        (await this.#getRepositoryContext())

      if (!context) return true

      const draft = {
        description: message.description ?? '',
        title: message.title ?? '',
      }

      await this.#sendValidation(draft)

      await this.#saveDraft(draft, context.repositoryPath, context.branch)

      return true
    }

    if (message.type === 'selectRepository') {
      await this.#selectRepository()

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

  async #loadDraft(
    repositoryPath: string,
    branch: string,
  ): Promise<CommitDraft> {
    const storageKey = getRepositoryStorageKey(
      COMMIT_DRAFT_STORAGE_KEY,
      repositoryPath,
      branch,
    )

    const draft = this.#extensionContext.workspaceState.get<CommitDraft>(storageKey)

    if (draft) return draft

    const legacyDraft =
      this.#extensionContext.workspaceState.get<CommitDraft>(
        COMMIT_DRAFT_STORAGE_KEY,
      )

    if (!legacyDraft) return EMPTY_DRAFT

    await this.#extensionContext.workspaceState.update(storageKey, legacyDraft)

    const clearedLegacyDraft = undefined

    await this.#extensionContext.workspaceState.update(
      COMMIT_DRAFT_STORAGE_KEY,
      clearedLegacyDraft,
    )

    return legacyDraft
  }

  async #saveDraft(
    draft: CommitDraft,
    repositoryPath: string,
    branch: string,
  ): Promise<void> {
    await this.#extensionContext.workspaceState.update(
      getRepositoryStorageKey(COMMIT_DRAFT_STORAGE_KEY, repositoryPath, branch),
      draft,
    )
  }

  async #post(message: Record<string, unknown>): Promise<void> {
    await this.#view?.webview.postMessage(message)
  }

  async #sendDraft(draft: CommitDraft): Promise<void> {
    await this.#post({ ...draft, type: 'draft' })
  }

  async #sendValidation(draft: CommitDraft): Promise<void> {
    const message = [draft.title.trim(), draft.description.trim()]
      .filter(Boolean)
      .join('\n\n')

    const validation = draft.title.trim()
      ? validateConventionalCommit(message, getCommitGenerationSettings())
      : { errors: [], valid: false }

    await this.#post({
      description: draft.description,
      errors: validation.errors,
      title: draft.title,
      type: 'validation',
      valid: validation.valid,
    })
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

  async #getRepositoryContext(): Promise<
    { branch: string; repositoryPath: string } | undefined
  > {
    const repositoryPath =
      this.#selectedRepositoryPath ??
      (await resolveRepositoryPath(this.#repository))

    if (!repositoryPath) {
      await this.#status('Difftale could not find a Git repository.', 'error')

      return undefined
    }

    const branchSyncStatus = await this.#repository.getBranchSyncStatus(repositoryPath)
    const context = { branch: branchSyncStatus.branch, repositoryPath }

    this.#activeRepositoryContext = context

    return context
  }

  async #selectRepository(): Promise<void> {
    const repositoryPaths = await getGitRepositoryPaths()

    if (repositoryPaths.length === 0) {
      await this.#status('Difftale could not find a Git repository.', 'error')

      return
    }

    const selection = await vscode.window.showQuickPick(
      repositoryPaths.map(repositoryPath => ({
        description: repositoryPath,
        label: basename(repositoryPath),
        repositoryPath,
      })),
      {
        placeHolder: 'Choose the repository used by Difftale composers',
        title: 'Difftale: Select Repository',
      },
    )

    if (!selection) return

    this.#selectedRepositoryPath = selection.repositoryPath

    this.#activeRepositoryContext = undefined

    await this.#refresh(true)
  }

  async #refresh(announce = false): Promise<void> {
    const context = await this.#getRepositoryContext()

    if (!context) return

    const { branch, repositoryPath } = context

    const [stagedFilePaths, unstagedFilePaths, branchSyncStatus] = await Promise.all([
      this.#repository.getStagedFilePaths(repositoryPath),
      this.#repository.getUnstagedFilePaths(repositoryPath),
      this.#repository.getBranchSyncStatus(repositoryPath),
    ])

    const settings = getCommitGenerationSettings()

    await this.#post({
      ...branchSyncStatus,
      maximumHeaderLengthCharacters: settings.maximumHeaderLengthCharacters,
      repositoryName: basename(repositoryPath),
      repositoryPath,
      stagedCount: stagedFilePaths.length,
      stagedFilePaths,
      type: 'context',
      unstagedFilePaths,
    })

    const draft = await this.#loadDraft(repositoryPath, branch)

    await this.#sendDraft(draft)

    await this.#sendValidation(draft)

    if (announce) {
      await this.#status(
        stagedFilePaths.length > 0
          ? 'Ready to generate or commit the staged changes.'
          : 'Stage a file with +, or select Stage all, to include changes in the commit.',
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

    const context = await this.#getRepositoryContext()

    if (!context) return

    const { repositoryPath } = context

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
    const context = await this.#getRepositoryContext()

    if (!context) return

    const { branch, repositoryPath } = context

    await this.#post({ type: 'busy', value: true })

    await this.#status('Generating from staged changes…')

    try {
      const diff = await this.#repository.getStagedDiff(repositoryPath)

      if (!diff.trim()) {
        await this.#status('Stage changes before generating a commit.', 'warning')

        return
      }

      const generatedDrafts = await this.#requestDrafts(repositoryPath, diff)
      const draft = generatedDrafts.drafts[0] ?? EMPTY_DRAFT

      await this.#saveDraft(draft, repositoryPath, branch)

      await this.#post({
        drafts: generatedDrafts.drafts,
        type: 'draftOptions',
      })

      await this.#status(
        generatedDrafts.source === 'ai'
          ? `${generatedDrafts.drafts.length} commit ${
              generatedDrafts.drafts.length === 1 ? 'draft' : 'drafts'
            } generated${generatedDrafts.truncated ? ' from a model-sized portion of the diff' : ''}.`
          : 'Local commit draft generated because AI generation was unavailable.',
        generatedDrafts.source === 'ai' ? 'success' : 'warning',
      )
    } catch (error) {
      await this.#status(
        error instanceof Error ? error.message : 'Commit generation failed.',
        'error',
      )
    } finally {
      await this.#post({ type: 'busy', value: false })
    }
  }

  async #requestDrafts(
    repositoryPath: string,
    diff: string,
  ): Promise<GeneratedCommitDrafts> {
    const settings = getCommitGenerationSettings()
    let models: readonly vscode.LanguageModelChat[]

    try {
      models = await vscode.lm.selectChatModels({
        family: settings.modelFamily,
        vendor: 'copilot',
      })
    } catch {
      return await this.#createFallbackDraft(repositoryPath)
    }

    const model = models[0]

    if (!model) {
      return this.#createFallbackDraft(repositoryPath)
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

      const drafts = parseAiDrafts(responseText).flatMap(commit => {
        const message = formatConventionalCommit(commit)

        return validateConventionalCommit(message, settings).valid
          ? [{
              description: commit.body ?? '',
              title: message.split('\n')[0] ?? '',
            }]
          : []
      })

      if (drafts.length === 0) {
        return await this.#createFallbackDraft(repositoryPath)
      }

      return {
        drafts,
        source: 'ai',
        truncated: diff.length > settings.maximumDiffLengthCharacters ||
          !prompt.includes(diff),
      }
    } catch {
      return await this.#createFallbackDraft(repositoryPath)
    } finally {
      cancellationTokenSource.dispose()
    }
  }

  async #createFallbackDraft(
    repositoryPath: string,
  ): Promise<GeneratedCommitDrafts> {
    const commit = createFallbackCommit(
      await this.#repository.getStagedFilePaths(repositoryPath),
    )

    const settings = getCommitGenerationSettings()
    let message = formatConventionalCommit(commit)

    if (!validateConventionalCommit(message, settings).valid) {
      commit.type = settings.allowedTypes[0] ?? commit.type

      message = formatConventionalCommit(commit)
    }

    return {
      drafts: [{
        description: commit.body ?? '',
        title: message.split('\n')[0] ?? '',
      }],
      source: 'local',
      truncated: false,
    }
  }

  async #commitDraft(draft: CommitDraft): Promise<void> {
    const context = await this.#getRepositoryContext()

    if (!context) return

    const { branch, repositoryPath } = context
    const message = [draft.title, draft.description].filter(Boolean).join('\n\n')

    await this.#post({ type: 'busy', value: true })

    try {
      this.#failure = undefined

      await this.#post({ type: 'clearCommitFailure' })

      const result = await this.#commit(repositoryPath, message)

      if (result.succeeded) {
        await this.#saveDraft(EMPTY_DRAFT, repositoryPath, branch)

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
