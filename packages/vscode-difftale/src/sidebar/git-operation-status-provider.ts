import { basename } from 'node:path'

import * as vscode from 'vscode'

import { GIT_OPERATION_HISTORY_LIMIT_COUNT } from '../constants'
import { getGitFailurePresentation } from '../git/get-git-failure-presentation'
import type { GitOperationRecord, GitOperationResult } from '../types'

const getDurationLabel = (durationMilliseconds: number | undefined): string =>
  durationMilliseconds === undefined
    ? ''
    : `${(durationMilliseconds / 1000).toFixed(1)}s`

const getStatusDescription = (record: GitOperationRecord): string => {
  const hookLabel = record.hookNames.join(' + ')

  if (record.phase === 'running') {
    return hookLabel ? `Running ${hookLabel}` : `Running git ${record.kind}`
  }

  if (record.phase === 'succeeded') {
    return [hookLabel ? `${hookLabel} passed` : 'Completed', getDurationLabel(record.durationMilliseconds)]
      .filter(Boolean)
      .join(' · ')
  }

  if (record.phase === 'cancelled') {
    return `Cancelled · ${getDurationLabel(record.durationMilliseconds)}`
  }

  return [
    record.failureSummary ??
      (hookLabel ? `Blocked during ${hookLabel}` : 'Git failed'),
    getDurationLabel(record.durationMilliseconds),
  ]
    .filter(Boolean)
    .join(' · ')
}

const getStatusIcon = (phase: GitOperationRecord['phase']): vscode.ThemeIcon => {
  if (phase === 'running') {
    return new vscode.ThemeIcon('loading~spin')
  }

  if (phase === 'succeeded') {
    return new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'))
  }

  if (phase === 'cancelled') {
    return new vscode.ThemeIcon('circle-slash')
  }

  return new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'))
}

const getFinishedPhase = (
  result: GitOperationResult,
): GitOperationRecord['phase'] => {
  if (result.cancelled) {
    return 'cancelled'
  }

  return result.succeeded ? 'succeeded' : 'failed'
}

class GitOperationTreeItem extends vscode.TreeItem {
  public constructor(record: GitOperationRecord) {
    const label = record.kind === 'commit' ? 'Commit' : 'Push'

    super(label, vscode.TreeItemCollapsibleState.None)

    this.command = {
      command: 'difftale.showGitOutput',
      title: 'Show Git Output',
    }

    this.contextValue = `difftale.operation.${record.phase}`

    this.description = getStatusDescription(record)

    this.iconPath = getStatusIcon(record.phase)

    this.tooltip = new vscode.MarkdownString(
      [
        `**${label} in ${basename(record.repositoryPath)}**`,
        '',
        this.description,
        '',
        record.hookNames.length > 0
          ? `Hooks: \`${record.hookNames.join('`, `')}\``
          : 'No matching executable hook was detected.',
        '',
        'Select to open the complete output.',
      ].join('\n'),
    )
  }
}

class EmptyOperationTreeItem extends vscode.TreeItem {
  public constructor() {
    super('No Difftale Git operations yet', vscode.TreeItemCollapsibleState.None)

    this.description = 'Commit or push from Quick Actions'

    this.iconPath = new vscode.ThemeIcon('info')
  }
}

export class GitOperationStatusProvider
  implements
    vscode.Disposable,
    vscode.TreeDataProvider<GitOperationTreeItem | EmptyOperationTreeItem>
{
  readonly #changeEmitter = new vscode.EventEmitter<void>()

  readonly #records: GitOperationRecord[] = []

  public readonly onDidChangeTreeData = this.#changeEmitter.event

  public dispose = (): void => {
    this.#changeEmitter.dispose()
  }

  public finish = (identifier: string, result: GitOperationResult): void => {
    const record = this.#records.find(candidate => candidate.id === identifier)

    if (!record) {
      return
    }

    record.cancelled = result.cancelled

    record.durationMilliseconds = result.durationMilliseconds

    record.failureSummary = result.succeeded
      ? undefined
      : getGitFailurePresentation({
          hookNames: record.hookNames,
          kind: record.kind,
          result,
        }).summary

    record.output = result.output

    record.phase = getFinishedPhase(result)

    this.#changeEmitter.fire()
  }

  public getChildren = (): (GitOperationTreeItem | EmptyOperationTreeItem)[] =>
    this.#records.length > 0
      ? this.#records.map(record => new GitOperationTreeItem(record))
      : [new EmptyOperationTreeItem()]

  public getTreeItem = (
    treeItem: GitOperationTreeItem | EmptyOperationTreeItem,
  ): GitOperationTreeItem | EmptyOperationTreeItem => treeItem

  public start = (
    kind: GitOperationRecord['kind'],
    repositoryPath: string,
    hookNames: string[],
  ): string => {
    const identifier = `${kind}-${Date.now()}`

    this.#records.unshift({
      cancelled: false,
      hookNames,
      id: identifier,
      kind,
      output: '',
      phase: 'running',
      repositoryPath,
      startedAt: Date.now(),
    })

    this.#records.splice(GIT_OPERATION_HISTORY_LIMIT_COUNT)

    this.#changeEmitter.fire()

    return identifier
  }
}
