import {
  type ConventionalCommit,
  formatConventionalCommit,
  type GitRepository,
  validateConventionalCommit
} from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { buildCommitPrompt } from './ai/build-commit-prompt'
import { parseAiDrafts } from './ai/parse-ai-drafts'
import { setGitInputMessage } from './git/git-source-control'
import { getCommitGenerationSettings } from './utils/get-commit-generation-settings'
import { getCommitProjectContext } from './commit-project-context'
import { createFallbackCommit } from './fallback-commit'
import { resolveRepositoryPath } from './repository-resolver'

interface CommitDraftQuickPickItem extends vscode.QuickPickItem {
  message: string
}

interface BreakingChangeQuickPickItem extends vscode.QuickPickItem {
  breaking: boolean
}

class CommitCompositionCancelledError extends Error {}

const requireCompositionValue = <Value>(value: Value | undefined): Value => {
  if (value === undefined) {
    throw new CommitCompositionCancelledError()
  }

  return value
}

export class CommitMessageController {
  readonly #repository: GitRepository

  public constructor(repository: GitRepository) {
    this.#repository = repository
  }

  public compose = async (resourceUri?: vscode.Uri): Promise<void> => {
    const repositoryPath = await resolveRepositoryPath(this.#repository, resourceUri)

    if (!repositoryPath) {
      await vscode.window.showErrorMessage('Difftale could not find a Git repository.')

      return
    }

    try {
      const settings = getCommitGenerationSettings()

      const type = requireCompositionValue(
        await vscode.window.showQuickPick([...settings.allowedTypes], {
          placeHolder: 'Select a Conventional Commit type',
          title: 'Difftale: Compose Commit'
        })
      )

      const scope = requireCompositionValue(
        await vscode.window.showInputBox({
          placeHolder: 'checkout',
          prompt: 'Optional short feature or package scope',
          title: 'Difftale: Commit Scope'
        })
      )

      const summary = requireCompositionValue(
        await vscode.window.showInputBox({
          placeHolder: 'preserve cart state during payment redirects',
          prompt: 'Lowercase imperative summary without a trailing period',
          title: 'Difftale: Commit Summary',
          validateInput: value => {
            if (!value.trim()) {
              return 'A summary is required.'
            }

            const candidate = formatConventionalCommit({
              breaking: false,
              scope: scope.trim() || undefined,
              summary: value.trim(),
              type
            })

            const result = validateConventionalCommit(candidate, settings)

            return result.valid ? undefined : result.errors.join(' ')
          }
        })
      )

      const body = requireCompositionValue(
        await vscode.window.showInputBox({
          placeHolder: 'Explain what changed and why',
          prompt: 'Optional detailed description',
          title: 'Difftale: Commit Body'
        })
      )

      const breakingSelection = requireCompositionValue(
        await vscode.window.showQuickPick<BreakingChangeQuickPickItem>(
          [
            {
              breaking: false,
              description: 'No public API incompatibility',
              label: 'No breaking change'
            },
            {
              breaking: true,
              description: 'Adds ! to the header and a BREAKING CHANGE footer',
              label: 'Breaking change'
            }
          ], {
            placeHolder: 'Does this commit introduce a breaking change?',
            title: 'Difftale: Breaking Change'
          }
        )
      )

      const footer = requireCompositionValue(
        breakingSelection.breaking ?
          await vscode.window.showInputBox({
            placeHolder: 'checkout sessions now require an identifier',
            prompt: 'Describe the incompatible behavior',
            title: 'Difftale: Breaking Change Description',
            validateInput: value => value.trim() ? undefined : 'A description is required.'
          }) :
          await vscode.window.showInputBox({
            placeHolder: 'Refs: #42',
            prompt: 'Optional issue reference or Git trailer',
            title: 'Difftale: Commit Footer'
          })
      )

      const message = formatConventionalCommit({
        body: body.trim() || undefined,
        breaking: breakingSelection.breaking,
        footer: breakingSelection.breaking ?
          `BREAKING CHANGE: ${footer.trim()}` :
          footer.trim() || undefined,
        scope: scope.trim() || undefined,
        summary: summary.trim(),
        type
      })

      await this.#applyMessage(repositoryPath, message)
    } catch (error) {
      if (error instanceof CommitCompositionCancelledError) {
        return
      }

      throw error
    }
  }

  public generate = async (resourceUri?: vscode.Uri): Promise<void> => {
    const repositoryPath = await resolveRepositoryPath(this.#repository, resourceUri)

    if (!repositoryPath) {
      await vscode.window.showErrorMessage('Difftale could not find a Git repository.')

      return
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.SourceControl,
        title: 'Difftale is creating commit drafts'
      }, async (_progress, cancellationToken) => {
        const diff = await this.#repository.getStagedDiff(repositoryPath)

        if (!diff.trim()) {
          await vscode.window.showWarningMessage(
            'Stage the changes you want Difftale to describe first.'
          )

          return
        }

        const settings = getCommitGenerationSettings()
        const projectContext = await getCommitProjectContext(this.#repository, repositoryPath)

        const drafts = await this.#generateWithModel(
          buildCommitPrompt({
            context: projectContext,
            diff,
            settings
          }), settings.modelFamily, cancellationToken
        )

        const validMessages = drafts
          .map(draft => formatConventionalCommit(draft))
          .filter(message => validateConventionalCommit(message, settings).valid)

        const messages =
          validMessages.length > 0 ?
            validMessages :
            [
              formatConventionalCommit(
                createFallbackCommit(
                  await this.#repository.getStagedFilePaths(repositoryPath)
                )
              )
            ]

        const selectedMessage = await this.#pickMessage(messages, Boolean(validMessages.length))

        if (selectedMessage) {
          await this.#applyMessage(repositoryPath, selectedMessage)
        }
      }
    )
  }

  async #applyMessage(repositoryPath: string, message: string): Promise<void> {
    const applied = await setGitInputMessage(repositoryPath, message)

    if (!applied) {
      await vscode.env.clipboard.writeText(message)

      await vscode.window.showInformationMessage(
        'Difftale copied the commit message because the Git Source Control input was unavailable.'
      )

      return
    }

    await vscode.commands.executeCommand('workbench.view.scm')
  }

  async #generateWithModel(
    prompt: string,
    modelFamily: string | undefined,
    cancellationToken: vscode.CancellationToken
  ): Promise<ConventionalCommit[]> {
    let models: readonly vscode.LanguageModelChat[]

    try {
      models = await vscode.lm.selectChatModels({
        family: modelFamily,
        vendor: 'copilot'
      })
    } catch {
      return []
    }

    const model = models[0]

    if (!model) {
      return []
    }

    try {
      const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)], {}, cancellationToken
      )

      let responseText = ''

      for await (const fragment of response.text) {
        responseText += fragment
      }

      return parseAiDrafts(responseText)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The selected model failed.'

      await vscode.window.showWarningMessage(
        `Difftale used a local fallback because AI generation failed: ${message}`
      )

      return []
    }
  }

  async #pickMessage(
    messages: readonly string[],
    generatedWithModel: boolean
  ): Promise<string | undefined> {
    const items: CommitDraftQuickPickItem[] = messages.map((message, index) => {
      const [header = '', ...bodyLines] = message.split('\n')

      return {
        description: generatedWithModel ? `AI draft ${index + 1}` : 'Local fallback',
        detail: bodyLines.join(' ').trim() || undefined,
        label: header,
        message
      }
    })

    const selectedItem = await vscode.window.showQuickPick(items, {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Select an editable commit draft',
      title: 'Difftale: Conventional Commit Drafts'
    })

    return selectedItem?.message
  }
}
