import { GitRepository } from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { CommitComposerProvider } from './commit/commit-composer-provider'
import { DifftaleGitController } from './git/difftale-git-controller'
import { PullRequestComposerProvider } from './pull-request/pull-request-composer-provider'
import { CurrentFileHistoryProvider } from './sidebar/current-file-history-provider'
import { GitOperationStatusProvider } from './sidebar/git-operation-status-provider'
import { QuickActionsProvider } from './sidebar/quick-actions-provider'
import { CommitMessageController } from './commit-message-controller'
import {
  COMMIT_COMPOSER_VIEW_ID,
  PULL_REQUEST_COMPOSER_VIEW_ID,
  REVISION_SCHEME,
} from './constants'
import { FileHistoryController } from './file-history-controller'
import { RevisionContentProvider } from './revision-content-provider'

export const activate = (extensionContext: vscode.ExtensionContext): void => {
  const repository = new GitRepository()
  const revisionContentProvider = new RevisionContentProvider(repository)
  const commitMessageController = new CommitMessageController(repository)

  const fileHistoryController = new FileHistoryController(
    repository,
    revisionContentProvider,
  )

  const currentFileHistoryProvider = new CurrentFileHistoryProvider(
    fileHistoryController,
    revisionContentProvider,
  )

  const gitOperationStatusProvider = new GitOperationStatusProvider()
  const quickActionsProvider = new QuickActionsProvider(repository)
  const gitOutputChannel = vscode.window.createOutputChannel('Difftale Git')

  const difftaleGitController = new DifftaleGitController({
    onOperationFinished: () => {
      currentFileHistoryProvider.refresh()

      quickActionsProvider.refresh()
    },
    outputChannel: gitOutputChannel,
    repository,
    statusProvider: gitOperationStatusProvider,
  })

  const commitComposerProvider = new CommitComposerProvider({
    commit: difftaleGitController.commitMessage,
    extensionContext,
    repository,
  })

  const pullRequestComposerProvider = new PullRequestComposerProvider({
    extensionContext,
    outputChannel: gitOutputChannel,
    repository,
  })

  extensionContext.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      REVISION_SCHEME,
      revisionContentProvider,
    ),
    vscode.commands.registerCommand(
      'difftale.generateCommitMessage',
      (sourceControl?: vscode.SourceControl) =>
        commitMessageController.generate(sourceControl?.rootUri),
    ),
    vscode.commands.registerCommand(
      'difftale.composeCommitMessage',
      (sourceControl?: vscode.SourceControl) =>
        commitMessageController.compose(sourceControl?.rootUri),
    ),
    vscode.commands.registerCommand(
      'difftale.showFileHistory',
      fileHistoryController.showHistory,
    ),
    vscode.commands.registerCommand(
      'difftale.olderRevision',
      fileHistoryController.older,
    ),
    vscode.commands.registerCommand(
      'difftale.newerRevision',
      fileHistoryController.newer,
    ),
    vscode.commands.registerCommand(
      'difftale.compareWithWorking',
      fileHistoryController.compareWithWorking,
    ),
    vscode.commands.registerCommand(
      'difftale.openFileRevision',
      fileHistoryController.openAtIndex,
    ),
    vscode.commands.registerCommand(
      'difftale.commit',
      (sourceControl?: vscode.SourceControl) =>
        difftaleGitController.commit(sourceControl?.rootUri),
    ),
    vscode.commands.registerCommand(
      'difftale.push',
      (sourceControl?: vscode.SourceControl) =>
        difftaleGitController.push(sourceControl?.rootUri),
    ),
    vscode.commands.registerCommand(
      'difftale.showGitOutput',
      difftaleGitController.showOutput,
    ),
    vscode.commands.registerCommand(
      'difftale.refreshSidebar',
      () => {
        currentFileHistoryProvider.refresh()

        quickActionsProvider.refresh()
      },
    ),
    vscode.commands.registerCommand(
      'difftale.focusCommitComposer',
      () => vscode.commands.executeCommand(`${COMMIT_COMPOSER_VIEW_ID}.focus`),
    ),
    vscode.commands.registerCommand(
      'difftale.focusPullRequestComposer',
      () => vscode.commands.executeCommand(`${PULL_REQUEST_COMPOSER_VIEW_ID}.focus`),
    ),
    vscode.window.registerWebviewViewProvider(
      COMMIT_COMPOSER_VIEW_ID,
      commitComposerProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
    vscode.window.registerWebviewViewProvider(
      PULL_REQUEST_COMPOSER_VIEW_ID,
      pullRequestComposerProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
    vscode.window.registerTreeDataProvider(
      'difftale.quickActions',
      quickActionsProvider,
    ),
    vscode.window.registerTreeDataProvider(
      'difftale.currentFileHistory',
      currentFileHistoryProvider,
    ),
    vscode.window.registerTreeDataProvider(
      'difftale.gitOperations',
      gitOperationStatusProvider,
    ),
    vscode.window.onDidChangeActiveTextEditor(currentFileHistoryProvider.refresh),
    vscode.workspace.onDidSaveTextDocument(currentFileHistoryProvider.refresh),
    currentFileHistoryProvider,
    fileHistoryController,
    gitOperationStatusProvider,
    quickActionsProvider,
    gitOutputChannel,
  )
}
