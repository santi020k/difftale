import {
  type GitRepository,
  validateConventionalCommit,
} from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { resolveRepositoryPath } from '../repository-resolver'
import type { GitOperationStatusProvider } from '../sidebar/git-operation-status-provider'
import type {
  GitCommitResult,
  GitHook,
  GitOperationResult,
} from '../types'
import { getCommitGenerationSettings } from '../utils/get-commit-generation-settings'

import { detectGitHooks } from './detect-git-hooks'
import { getGitFailurePresentation } from './get-git-failure-presentation'
import { GitOperationRunner } from './git-operation-runner'
import { getGitInputMessage, setGitInputMessage } from './git-source-control'

interface DifftaleGitControllerOptions {
  onOperationFinished?: () => void
  outputChannel: vscode.OutputChannel
  repository: GitRepository
  statusProvider: GitOperationStatusProvider
}

interface CompletedGitOperation {
  detectedHookNames: string[]
  result: GitOperationResult
}

const getOperationLabel = (kind: 'commit' | 'push'): string =>
  kind === 'commit' ? 'Commit' : 'Push'

const getRunningMessage = (kind: 'commit' | 'push', hooks: readonly GitHook[]): string => {
  const detectedHookNames = hooks.filter(hook => hook.exists).map(hook => hook.name)

  return detectedHookNames.length > 0
    ? `Running ${detectedHookNames.join(' and ')}`
    : `Running git ${kind}`
}

const requestGitCredential = async (prompt: string): Promise<string | undefined> =>
  vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: /passphrase|password/iu.test(prompt),
    prompt: prompt.trim() || 'Enter the credential requested by Git.',
    title: 'Difftale Git authentication',
  })

const getResultSummary = (
  operationLabel: string,
  result: GitOperationResult,
): string => {
  if (result.cancelled) {
    return `${operationLabel} cancelled after ${result.durationMilliseconds}ms.`
  }

  const outcome = result.succeeded
    ? 'completed'
    : `failed with exit code ${result.exitCode ?? 'unknown'}`

  return `${operationLabel} ${outcome} after ${result.durationMilliseconds}ms.`
}

export class DifftaleGitController {
  readonly #onOperationFinished: (() => void) | undefined
  readonly #outputChannel: vscode.OutputChannel
  readonly #repository: GitRepository
  readonly #runner = new GitOperationRunner()
  readonly #statusProvider: GitOperationStatusProvider

  public constructor(options: DifftaleGitControllerOptions) {
    this.#onOperationFinished = options.onOperationFinished

    this.#outputChannel = options.outputChannel

    this.#repository = options.repository

    this.#statusProvider = options.statusProvider
  }

  public commit = async (resourceUri?: vscode.Uri): Promise<void> => {
    const repositoryPath = await resolveRepositoryPath(this.#repository, resourceUri)

    if (!repositoryPath) {
      await vscode.window.showErrorMessage('Difftale could not find a Git repository.')

      return
    }

    const message = (await getGitInputMessage(repositoryPath))?.trim()

    if (!message) {
      const action = await vscode.window.showWarningMessage(
        'Write or generate a commit message before committing with Difftale.',
        'Generate with AI',
        'Compose',
      )

      if (action === 'Generate with AI') {
        await vscode.commands.executeCommand('difftale.generateCommitMessage')
      } else if (action === 'Compose') {
        await vscode.commands.executeCommand('difftale.composeCommitMessage')
      }

      return
    }

    await this.commitMessage(repositoryPath, message)
  }

  public commitMessage = async (
    repositoryPath: string,
    message: string,
  ): Promise<GitCommitResult> => {
    const validation = validateConventionalCommit(message, getCommitGenerationSettings())

    if (!validation.valid) {
      const summary = validation.errors.join(' ')

      await vscode.window.showErrorMessage(
        `Difftale did not commit because the message is invalid: ${summary}`,
      )

      return {
        failure: {
          details: summary,
          summary,
          title: 'Commit message is invalid',
        },
        succeeded: false,
      }
    }

    const hookNames: GitHook['name'][] = ['pre-commit']

    const operation = await this.#runOperation(
      'commit',
      repositoryPath,
      ['commit', '--file=-'],
      hookNames,
      `${message}\n`,
    )

    const { detectedHookNames, result } = operation

    if (result.succeeded) {
      await setGitInputMessage(repositoryPath, '')
    }

    return {
      failure: result.succeeded
        ? undefined
        : getGitFailurePresentation({
            hookNames: detectedHookNames,
            kind: 'commit',
            result,
          }),
      succeeded: result.succeeded,
    }
  }

  public push = async (resourceUri?: vscode.Uri): Promise<void> => {
    const repositoryPath = await resolveRepositoryPath(this.#repository, resourceUri)

    if (!repositoryPath) {
      await vscode.window.showErrorMessage('Difftale could not find a Git repository.')

      return
    }

    const branchSyncStatus = await this.#repository.getBranchSyncStatus(repositoryPath)

    const arguments_ =
      branchSyncStatus.publishRequired && branchSyncStatus.remoteName
        ? [
            'push',
            '--set-upstream',
            branchSyncStatus.remoteName,
            branchSyncStatus.branch,
          ]
        : ['push']

    await this.#runOperation(
      'push',
      repositoryPath,
      arguments_,
      ['pre-push'],
    )
  }

  public showOutput = (): void => {
    this.#outputChannel.show(true)
  }

  async #runOperation(
    kind: 'commit' | 'push',
    repositoryPath: string,
    arguments_: readonly string[],
    hookNames: readonly GitHook['name'][],
    input?: string,
  ): Promise<CompletedGitOperation> {
    const hooks = await detectGitHooks(repositoryPath, hookNames)
    const detectedHookNames = hooks.filter(hook => hook.exists).map(hook => hook.name)

    const operationIdentifier = this.#statusProvider.start(
      kind,
      repositoryPath,
      detectedHookNames,
    )

    const operationLabel = getOperationLabel(kind)
    const startedAt = Date.now()

    this.#outputChannel.appendLine('')

    this.#outputChannel.appendLine(
      `[${new Date(startedAt).toLocaleTimeString()}] ${operationLabel} · ${repositoryPath}`,
    )

    this.#outputChannel.appendLine(
      detectedHookNames.length > 0
        ? `Detected hooks: ${detectedHookNames.join(', ')}`
        : `No executable ${hookNames.join(' or ')} hook detected.`,
    )

    this.#outputChannel.appendLine(`$ git ${arguments_.join(' ')}`)

    const result = await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: `${operationLabel} with Difftale`,
      },
      async (progress, cancellationToken) => {
        progress.report({
          message: getRunningMessage(kind, hooks),
        })

        const abortController = new AbortController()

        const cancellationDisposable = cancellationToken.onCancellationRequested(() => {
          abortController.abort()
        })

        try {
          return await this.#runner.run(
            {
              arguments: arguments_,
              input,
              kind,
              repositoryPath,
            },
            {
              abortSignal: abortController.signal,
              onOutput: output => { this.#outputChannel.append(output); },
              onPrompt: kind === 'push'
                ? requestGitCredential
                : undefined,
            },
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Git could not start.'

          this.#outputChannel.appendLine(message)

          return {
            cancelled: false,
            durationMilliseconds: Date.now() - startedAt,
            exitCode: null,
            output: message,
            succeeded: false,
          }
        } finally {
          cancellationDisposable.dispose()
        }
      },
    )

    this.#outputChannel.appendLine('')

    this.#outputChannel.appendLine(getResultSummary(operationLabel, result))

    this.#statusProvider.finish(operationIdentifier, result)

    this.#onOperationFinished?.()

    await vscode.commands.executeCommand('git.refresh')

    this.#showResult(kind, detectedHookNames, result).catch((error: unknown) => {
      this.#outputChannel.appendLine(
        error instanceof Error ? error.message : 'Difftale could not show the result.',
      )
    })

    return { detectedHookNames, result }
  }

  async #showResult(
    kind: 'commit' | 'push',
    detectedHookNames: readonly string[],
    result: GitOperationResult,
  ): Promise<void> {
    const operationLabel = getOperationLabel(kind)
    const hookLabel = detectedHookNames.join(' and ')

    if (result.cancelled) {
      await vscode.window.showInformationMessage(`${operationLabel} cancelled.`)

      return
    }

    if (result.succeeded) {
      const action = await vscode.window.showInformationMessage(
        hookLabel
          ? `${operationLabel} completed. ${hookLabel} passed.`
          : `${operationLabel} completed.`,
        'Show Output',
      )

      if (action === 'Show Output') {
        this.showOutput()
      }

      return
    }

    const failure = getGitFailurePresentation({
      hookNames: detectedHookNames,
      kind,
      result,
    })

    const action = await vscode.window.showErrorMessage(
      `${failure.title}: ${failure.summary}`,
      'Show Output',
      'Copy Error',
    )

    if (action === 'Show Output') {
      this.showOutput()
    } else if (action === 'Copy Error') {
      await vscode.env.clipboard.writeText(
        [failure.title, failure.summary, '', failure.details].join('\n'),
      )
    }
  }
}
