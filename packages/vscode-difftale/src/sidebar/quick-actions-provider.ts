import type { GitBranchSyncStatus, GitRepository } from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { resolveRepositoryPath } from '../repository-resolver'

interface QuickAction {
  command: string
  description: string
  icon: string
  label: string
}

const SECONDARY_ACTIONS: readonly QuickAction[] = [
  {
    command: 'difftale.showFileHistory',
    description: 'Search revisions of the active file',
    icon: 'history',
    label: 'Browse File History',
  },
  {
    command: 'difftale.showGitOutput',
    description: 'Inspect complete Git and hook output',
    icon: 'output',
    label: 'Show Git Output',
  },
]

const getPushAction = (
  branchSyncStatus: GitBranchSyncStatus,
): QuickAction | undefined => {
  if (branchSyncStatus.publishRequired && branchSyncStatus.remoteName) {
    return {
      command: 'difftale.push',
      description: `${branchSyncStatus.branch} → ${branchSyncStatus.remoteName}/${branchSyncStatus.branch} · set upstream`,
      icon: 'cloud-upload',
      label: 'Publish Branch',
    }
  }

  if (branchSyncStatus.aheadCount === 0 || branchSyncStatus.behindCount > 0) {
    return undefined
  }

  const commitLabel = branchSyncStatus.aheadCount === 1 ? 'commit' : 'commits'

  const destination = branchSyncStatus.upstreamBranch
    ? `${branchSyncStatus.branch} → ${branchSyncStatus.upstreamBranch}`
    : branchSyncStatus.branch

  return {
    command: 'difftale.push',
    description: `${destination} · run pre-push checks`,
    icon: 'cloud-upload',
    label: `Push ${branchSyncStatus.aheadCount} ${commitLabel}`,
  }
}

class QuickActionTreeItem extends vscode.TreeItem {
  public constructor(action: QuickAction) {
    super(action.label, vscode.TreeItemCollapsibleState.None)

    this.command = {
      command: action.command,
      title: action.label,
    }

    this.description = action.description

    this.iconPath = new vscode.ThemeIcon(action.icon)

    this.tooltip = action.description
  }
}

export class QuickActionsProvider
  implements vscode.Disposable, vscode.TreeDataProvider<QuickActionTreeItem>
{
  readonly #changeEmitter = new vscode.EventEmitter<void>()
  readonly #repository: GitRepository

  public readonly onDidChangeTreeData = this.#changeEmitter.event

  public constructor(repository: GitRepository) {
    this.#repository = repository
  }

  public dispose = (): void => {
    this.#changeEmitter.dispose()
  }

  public getChildren = async (): Promise<QuickActionTreeItem[]> => {
    const repositoryPath = await resolveRepositoryPath(this.#repository)

    if (!repositoryPath) {
      return SECONDARY_ACTIONS.map(action => new QuickActionTreeItem(action))
    }

    const branchSyncStatus = await this.#repository.getBranchSyncStatus(repositoryPath)
    const pushAction = getPushAction(branchSyncStatus)

    const actions = pushAction
      ? [pushAction, ...SECONDARY_ACTIONS]
      : SECONDARY_ACTIONS

    return actions.map(action => new QuickActionTreeItem(action))
  }

  public getTreeItem = (treeItem: QuickActionTreeItem): QuickActionTreeItem => treeItem

  public refresh = (): void => {
    this.#changeEmitter.fire()
  }
}
