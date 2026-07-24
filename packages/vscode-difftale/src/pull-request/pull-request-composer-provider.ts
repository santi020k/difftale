import {
  type GitRepository,
  validateConventionalCommit,
} from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { fitPullRequestPrompt } from '../ai/fit-pull-request-prompt'
import { parsePullRequestDraft } from '../ai/parse-pull-request-draft'
import { PULL_REQUEST_DRAFT_STORAGE_KEY } from '../constants'
import { resolveRepositoryPath } from '../repository-resolver'
import type {
  PullRequestDraft,
  PullRequestGenerationContext,
} from '../types'
import { createNonce } from '../utils/create-nonce'
import { getCommitGenerationSettings } from '../utils/get-commit-generation-settings'
import { getString } from '../utils/get-string'
import { isRecord } from '../utils/is-record'

import { getPullRequestComposerHtml } from './get-pull-request-composer-html'
import { GitHubPullRequestService } from './github-pull-request-service'

interface PullRequestComposerProviderOptions {
  extensionContext: vscode.ExtensionContext
  outputChannel: vscode.OutputChannel
  repository: GitRepository
}

interface PullRequestComposerMessage {
  description?: string
  title?: string
  type: string
}

const EMPTY_DRAFT: PullRequestDraft = {
  description: '',
  title: '',
}

const parseMessage = (value: unknown): PullRequestComposerMessage | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const type = getString(value, 'type')

  if (!type) {
    return undefined
  }

  return {
    description: getString(value, 'description'),
    title: getString(value, 'title'),
    type,
  }
}

const getCreationErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'PR creation failed.'
  }

  return error.message.includes('ENOENT')
    ? 'Install and authenticate GitHub CLI (gh) to create pull requests.'
    : error.message
}

export class PullRequestComposerProvider implements vscode.WebviewViewProvider {
  readonly #extensionContext: vscode.ExtensionContext
  readonly #outputChannel: vscode.OutputChannel
  readonly #repository: GitRepository
  readonly #pullRequestService = new GitHubPullRequestService()
  #view: vscode.WebviewView | undefined

  public constructor(options: PullRequestComposerProviderOptions) {
    this.#extensionContext = options.extensionContext

    this.#outputChannel = options.outputChannel

    this.#repository = options.repository
  }

  public resolveWebviewView = (webviewView: vscode.WebviewView): void => {
    this.#view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.#extensionContext.extensionUri],
    }

    webviewView.webview.html = getPullRequestComposerHtml(
      webviewView.webview.cspSource,
      createNonce(),
    )

    webviewView.webview.onDidReceiveMessage(value => this.#handleMessage(value))
  }

  async #handleMessage(value: unknown): Promise<void> {
    const message = parseMessage(value)

    if (!message) {
      return
    }

    if (await this.#handleViewMessage(message)) {
      return
    }

    const draft = {
      description: message.description?.trim() ?? '',
      title: message.title?.trim() ?? '',
    }

    if (message.type === 'copy') {
      await this.#copy(draft)

      return
    }

    if (message.type === 'create') {
      await this.#create(draft)
    }
  }

  async #handleViewMessage(message: PullRequestComposerMessage): Promise<boolean> {
    if (message.type === 'ready') {
      await this.#sendDraft(this.#getDraft())

      await this.#sendBranchStatus()

      return true
    }

    if (message.type === 'draftChanged') {
      await this.#saveDraft({
        description: message.description ?? '',
        title: message.title ?? '',
      })

      return true
    }

    if (message.type === 'generate') {
      await this.#generate()

      return true
    }

    return false
  }

  #getDraft(): PullRequestDraft {
    return (
      this.#extensionContext.workspaceState.get<PullRequestDraft>(
        PULL_REQUEST_DRAFT_STORAGE_KEY,
      ) ?? EMPTY_DRAFT
    )
  }

  async #saveDraft(draft: PullRequestDraft): Promise<void> {
    await this.#extensionContext.workspaceState.update(
      PULL_REQUEST_DRAFT_STORAGE_KEY,
      draft,
    )
  }

  async #sendDraft(draft: PullRequestDraft): Promise<void> {
    await this.#view?.webview.postMessage({
      description: draft.description,
      title: draft.title,
      type: 'setDraft',
    })
  }

  async #sendStatus(
    text: string,
    kind: 'error' | 'info' | 'success' | 'warning' = 'info',
  ): Promise<void> {
    await this.#view?.webview.postMessage({ kind, text, type: 'status' })
  }

  async #setBusy(value: boolean): Promise<void> {
    await this.#view?.webview.postMessage({ type: 'busy', value })
  }

  async #getContext(): Promise<
    { generation: PullRequestGenerationContext; repositoryPath: string } | undefined
  > {
    const repositoryPath = await resolveRepositoryPath(this.#repository)

    if (!repositoryPath) {
      await vscode.window.showErrorMessage('Difftale could not find a Git repository.')

      return undefined
    }

    const currentBranch = await this.#repository.getCurrentBranch(repositoryPath)
    const baseBranch = await this.#repository.getDefaultBaseBranch(repositoryPath)

    const [commitSubjects, diff] = await Promise.all([
      this.#repository.getCommitSubjectsBetween(repositoryPath, baseBranch),
      this.#repository.getPullRequestDiff(repositoryPath, baseBranch),
    ])

    return {
      generation: {
        baseBranch,
        commitSubjects,
        currentBranch,
        diff,
      },
      repositoryPath,
    }
  }

  async #sendBranchStatus(): Promise<void> {
    try {
      const context = await this.#getContext()

      if (context) {
        const settings = getCommitGenerationSettings()

        const normalizedBaseBranch = context.generation.baseBranch.replace(
          /^origin\//,
          '',
        )

        await this.#view?.webview.postMessage({
          baseBranch: context.generation.baseBranch,
          canCreatePullRequest:
            context.generation.currentBranch !== normalizedBaseBranch,
          currentBranch: context.generation.currentBranch,
          maximumHeaderLengthCharacters: settings.maximumHeaderLengthCharacters,
          type: 'context',
        })

        await this.#sendStatus(
          context.generation.currentBranch === normalizedBaseBranch
            ? 'Create a feature branch before opening a pull request.'
            : 'Ready to draft from the current branch.',
          context.generation.currentBranch === normalizedBaseBranch ? 'warning' : 'info',
        )
      }
    } catch (error) {
      await this.#sendStatus(
        error instanceof Error ? error.message : 'Unable to read branch context.',
        'error',
      )
    }
  }

  async #generate(): Promise<void> {
    await this.#setBusy(true)

    await this.#sendStatus('Generating from the current branch…')

    try {
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: 'Difftale is creating a pull request draft',
        },
        async (_progress, cancellationToken) => {
          const context = await this.#getContext()

          if (!context) {
            return
          }

          if (!context.generation.diff.trim()) {
            await vscode.window.showWarningMessage(
              `No committed changes were found between ${context.generation.currentBranch} and ${context.generation.baseBranch}.`,
            )

            return
          }

          const settings = getCommitGenerationSettings()

          const models = await vscode.lm.selectChatModels({
            family: settings.modelFamily,
            vendor: 'copilot',
          })

          const model = models[0]

          if (!model) {
            await vscode.window.showWarningMessage(
              'No VS Code language model is available for PR generation.',
            )

            return
          }

          const fittedPrompt = await fitPullRequestPrompt({
            context: context.generation,
            countTokens: prompt => model.countTokens(prompt, cancellationToken),
            maximumInputTokens: model.maxInputTokens,
            settings,
          })

          const response = await model.sendRequest(
            [
              vscode.LanguageModelChatMessage.User(
                fittedPrompt.prompt,
              ),
            ],
            {},
            cancellationToken,
          )

          let responseText = ''

          for await (const fragment of response.text) {
            responseText += fragment
          }

          const draft = parsePullRequestDraft(responseText)

          if (!draft) {
            await vscode.window.showWarningMessage(
              'The language model returned an invalid PR draft. Try generating again.',
            )

            return
          }

          const validation = validateConventionalCommit(draft.title, settings)

          if (!validation.valid) {
            await vscode.window.showWarningMessage(
              `The generated PR title is invalid: ${validation.errors.join(' ')}`,
            )

            return
          }

          await this.#saveDraft(draft)

          await this.#sendDraft(draft)

          await this.#sendStatus(
            fittedPrompt.truncated
              ? `Draft generated from a model-sized portion of the diff for ${context.generation.currentBranch} → ${context.generation.baseBranch}.`
              : `Draft generated for ${context.generation.currentBranch} → ${context.generation.baseBranch}.`,
            'success',
          )
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PR generation failed.'

      await vscode.window.showErrorMessage(`Difftale could not generate the PR: ${message}`)

      await this.#sendStatus(message, 'error')
    } finally {
      await this.#setBusy(false)
    }
  }

  async #copy(draft: PullRequestDraft): Promise<void> {
    if (!draft.title && !draft.description) {
      await vscode.window.showWarningMessage('Write or generate a PR draft first.')

      return
    }

    const text = [draft.title, draft.description].filter(Boolean).join('\n\n')

    await vscode.env.clipboard.writeText(text)

    await this.#sendStatus('PR title and description copied.', 'success')
  }

  async #create(draft: PullRequestDraft): Promise<void> {
    if (!draft.title || !draft.description) {
      await vscode.window.showWarningMessage(
        'A PR title and description are required.',
      )

      return
    }

    const settings = getCommitGenerationSettings()
    const validation = validateConventionalCommit(draft.title, settings)

    if (!validation.valid) {
      await vscode.window.showWarningMessage(
        `Fix the PR title before creating it: ${validation.errors.join(' ')}`,
      )

      return
    }

    await this.#setBusy(true)

    try {
      await vscode.window.withProgress(
        {
          cancellable: true,
          location: vscode.ProgressLocation.Notification,
          title: 'Difftale is creating the pull request',
        },
        async (_progress, cancellationToken) => {
          const context = await this.#getContext()

          if (!context) {
            return
          }

          const abortController = new AbortController()

          const cancellationDisposable = cancellationToken.onCancellationRequested(() => {
            abortController.abort()
          })

          this.#outputChannel.appendLine('')

          this.#outputChannel.appendLine(
            `[pull request] ${context.generation.currentBranch} → ${context.generation.baseBranch}`,
          )

          this.#outputChannel.show(true)

          try {
            const result = await this.#pullRequestService.create(
              {
                baseBranch: context.generation.baseBranch.replace(/^origin\//, ''),
                currentBranch: context.generation.currentBranch,
                description: draft.description,
                repositoryPath: context.repositoryPath,
                title: draft.title,
              },
              {
                abortSignal: abortController.signal,
                onOutput: output => { this.#outputChannel.append(output); },
              },
            )

            if (!result.succeeded) {
              const detail = result.output || 'GitHub CLI did not create the PR.'

              await vscode.window.showErrorMessage(
                `Difftale could not create the PR. ${detail}`,
              )

              await this.#sendStatus(
                'PR creation failed. See Difftale Git output.',
                'error',
              )

              return
            }

            await this.#sendStatus('Pull request created successfully.', 'success')

            if (result.url) {
              const selection = await vscode.window.showInformationMessage(
                'Difftale created the pull request.',
                'Open Pull Request',
              )

              if (selection === 'Open Pull Request') {
                await vscode.env.openExternal(vscode.Uri.parse(result.url))
              }
            } else {
              await vscode.window.showInformationMessage(
                'Difftale created the pull request.',
              )
            }
          } finally {
            cancellationDisposable.dispose()
          }
        },
      )
    } catch (error) {
      const message = getCreationErrorMessage(error)

      await vscode.window.showErrorMessage(message)

      await this.#sendStatus(message, 'error')
    } finally {
      await this.#setBusy(false)
    }
  }
}
