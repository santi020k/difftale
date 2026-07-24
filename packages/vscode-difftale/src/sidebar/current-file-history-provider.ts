import * as vscode from 'vscode'

import type { FileHistoryController } from '../file-history-controller'
import type { RevisionContentProvider } from '../revision-content-provider'
import type { RevisionTarget } from '../types'

const getOriginalFilePath = (
  activeUri: vscode.Uri | undefined,
  revisionProvider: RevisionContentProvider,
): string | undefined => {
  if (!activeUri) {
    return undefined
  }

  return activeUri.scheme === 'file'
    ? activeUri.fsPath
    : revisionProvider.getOriginalFilePath(activeUri)
}

class FileHistoryTreeItem extends vscode.TreeItem {
  public readonly absoluteFilePath: string
  public readonly revisionHash: string | undefined

  public constructor(
    target: RevisionTarget,
    absoluteFilePath: string,
    targetIndex: number,
  ) {
    const revision = target.revision

    super(
      target.kind === 'working' ? 'Working Tree' : revision?.subject ?? target.label,
      vscode.TreeItemCollapsibleState.None,
    )

    this.absoluteFilePath = absoluteFilePath

    this.revisionHash = revision?.hash

    this.command = {
      arguments: [vscode.Uri.file(absoluteFilePath), targetIndex],
      command: 'difftale.openFileRevision',
      title: 'Open File Revision',
    }

    this.contextValue = revision ? 'difftaleCommittedRevision' : undefined

    this.description = revision
      ? `${revision.shortHash} · ${new Date(revision.authoredAt).toLocaleDateString()}`
      : 'Uncommitted'

    this.iconPath = new vscode.ThemeIcon(
      target.kind === 'working' ? 'edit' : 'git-commit',
    )

    this.tooltip = revision
      ? new vscode.MarkdownString(
          [
            `**${revision.subject}**`,
            '',
            revision.body || 'No commit body.',
            '',
            `${revision.author} · ${new Date(revision.authoredAt).toLocaleString()}`,
          ].join('\n'),
        )
      : 'Compare the working file with HEAD.'
  }
}

class FileHistoryMessageTreeItem extends vscode.TreeItem {
  public constructor(label: string, description: string) {
    super(label, vscode.TreeItemCollapsibleState.None)

    this.description = description

    this.iconPath = new vscode.ThemeIcon('info')
  }
}

export class CurrentFileHistoryProvider
  implements
    vscode.Disposable,
    vscode.TreeDataProvider<FileHistoryTreeItem | FileHistoryMessageTreeItem>
{
  readonly #changeEmitter = new vscode.EventEmitter<void>()

  readonly #controller: FileHistoryController
  readonly #revisionProvider: RevisionContentProvider

  public readonly onDidChangeTreeData = this.#changeEmitter.event

  public constructor(
    controller: FileHistoryController,
    revisionProvider: RevisionContentProvider,
  ) {
    this.#controller = controller

    this.#revisionProvider = revisionProvider
  }

  public dispose = (): void => {
    this.#changeEmitter.dispose()
  }

  public getChildren = async (): Promise<
    (FileHistoryTreeItem | FileHistoryMessageTreeItem)[]
  > => {
    const activeUri = vscode.window.activeTextEditor?.document.uri
    const originalFilePath = getOriginalFilePath(activeUri, this.#revisionProvider)

    if (!originalFilePath) {
      return [
        new FileHistoryMessageTreeItem(
          'Open a tracked file',
          'Its revisions will appear here',
        ),
      ]
    }

    const state = await this.#controller.getNavigationState(
      vscode.Uri.file(originalFilePath),
      true,
    )

    if (!state || state.targets.length === 0) {
      return [
        new FileHistoryMessageTreeItem(
          'No committed revisions',
          'The active file is not tracked yet',
        ),
      ]
    }

    return state.targets.map(
      (target, targetIndex) =>
        new FileHistoryTreeItem(target, state.absoluteFilePath, targetIndex),
    )
  }

  public getTreeItem = (
    treeItem: FileHistoryTreeItem | FileHistoryMessageTreeItem,
  ): FileHistoryTreeItem | FileHistoryMessageTreeItem => treeItem

  public refresh = (): void => {
    this.#changeEmitter.fire()
  }
}
