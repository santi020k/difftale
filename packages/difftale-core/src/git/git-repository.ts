import { relative } from 'node:path'

import { RECENT_COMMIT_LIMIT_COUNT } from '../constants.js'
import type { GitBranchSyncStatus, GitCommandRunner, GitRepositoryOptions, GitRevision  } from '../types.js'
import { normalizeGitPath } from '../utils/normalize-git-path.js'

import { NodeGitCommandRunner } from './node-git-command-runner.js'
import { parseGitLog } from './parse-git-log.js'

export class GitRepository {
  readonly #runner: GitCommandRunner

  public constructor(options: GitRepositoryOptions = {}) {
    this.#runner = options.runner ?? new NodeGitCommandRunner()
  }

  async #tryRun(
    arguments_: readonly string[],
    repositoryPath: string
  ): Promise<string | undefined> {
    try {
      return await this.#runner.run(arguments_, repositoryPath)
    } catch {
      return undefined
    }
  }

  async #getUnpublishedBranchSyncStatus(
    repositoryPath: string,
    branch: string
  ): Promise<GitBranchSyncStatus> {
    const remoteNames = (
      (await this.#tryRun(['remote'], repositoryPath)) ?? ''
    )
      .split('\n')
      .map(remoteName => remoteName.trim())
      .filter(Boolean)

    const remoteName = remoteNames.includes('origin') ?
      'origin' :
      remoteNames[0]

    const hasCommits =
      (await this.#tryRun(
        ['rev-parse', '--verify', 'HEAD'], repositoryPath
      )) !== undefined

    return {
      aheadCount: 0,
      behindCount: 0,
      branch,
      publishRequired: Boolean(remoteName && hasCommits && branch !== 'Detached HEAD'),
      remoteName
    }
  }

  public findRoot = async (filePath: string): Promise<string> => (await this.#runner.run(['-C', filePath, 'rev-parse', '--show-toplevel'])).trim()

  public getFileAtRevision = async (
    repositoryPath: string,
    revision: GitRevision
  ): Promise<string> => {
    if (!revision.existsAtRevision) {
      return ''
    }

    return this.#runner.run(['show', `${revision.hash}:${revision.filePath}`], repositoryPath)
  }

  public getFileHistory = async (
    repositoryPath: string,
    absoluteFilePath: string
  ): Promise<GitRevision[]> => {
    const relativeFilePath = normalizeGitPath(relative(repositoryPath, absoluteFilePath))

    const format = [
      '%x1e%H',
      '%h',
      '%an',
      '%aI',
      '%s',
      '%b',
      ''
    ].join('%x1f')

    const output = await this.#runner.run(
      ['log', '--follow', `--format=${format}`, '--name-status', '--', relativeFilePath], repositoryPath
    )

    return parseGitLog(output)
  }

  public getRecentCommitSubjects = async (
    repositoryPath: string,
    limitCount = RECENT_COMMIT_LIMIT_COUNT
  ): Promise<string[]> => {
    const hasCommits =
      (await this.#tryRun(
        ['rev-parse', '--verify', 'HEAD'], repositoryPath
      )) !== undefined

    if (!hasCommits) {
      return []
    }

    const output = await this.#runner.run(
      ['log', `-${limitCount}`, '--format=%s'], repositoryPath
    )

    return output
      .split('\n')
      .map(subject => subject.trim())
      .filter(Boolean)
  }

  public getCurrentBranch = async (repositoryPath: string): Promise<string> => {
    const branch = (
      await this.#runner.run(['branch', '--show-current'], repositoryPath)
    ).trim()

    if (!branch) {
      throw new Error('Difftale cannot create a pull request from a detached HEAD.')
    }

    return branch
  }

  public getBranches = async (repositoryPath: string): Promise<string[]> => {
    const output = await this.#runner.run(
      [
        'for-each-ref',
        '--format=%(refname:short)',
        'refs/heads',
        'refs/remotes'
      ], repositoryPath
    )

    return [
      ...new Set(
        output
          .split('\n')
          .map(branch => branch.trim())
          .filter(branch => branch && !branch.endsWith('/HEAD'))
      )
    ]
  }

  public getRemoteUrl = async (
    repositoryPath: string
  ): Promise<string | undefined> => {
    const remoteNames = (
      (await this.#tryRun(['remote'], repositoryPath)) ?? ''
    )
      .split('\n')
      .map(remoteName => remoteName.trim())
      .filter(Boolean)

    const remoteName = remoteNames.includes('origin') ?
      'origin' :
      remoteNames[0]

    if (!remoteName) return undefined

    return (
      await this.#tryRun(['remote', 'get-url', remoteName], repositoryPath)
    )?.trim()
  }

  public getBranchSyncStatus = async (
    repositoryPath: string
  ): Promise<GitBranchSyncStatus> => {
    const branch =
      (
        await this.#tryRun(
          ['branch', '--show-current'], repositoryPath
        )
      )?.trim() || 'Detached HEAD'

    const upstreamBranch = (
      (await this.#tryRun(
        ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], repositoryPath
      )) ?? ''
    ).trim()

    if (!upstreamBranch) {
      return this.#getUnpublishedBranchSyncStatus(repositoryPath, branch)
    }

    const counts = (
      await this.#runner.run(
        ['rev-list', '--left-right', '--count', `${upstreamBranch}...HEAD`], repositoryPath
      )
    )
      .trim()
      .split(/\s+/u)

    const behindCount = Number(counts[0] ?? 0)
    const aheadCount = Number(counts[1] ?? 0)

    return {
      aheadCount,
      behindCount,
      branch,
      publishRequired: false,
      remoteName: upstreamBranch.split('/')[0],
      upstreamBranch
    }
  }

  public getDefaultBaseBranch = async (repositoryPath: string): Promise<string> => {
    const remoteHead = (
      (await this.#tryRun(
        ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], repositoryPath
      )) ?? ''
    ).trim()

    if (remoteHead) {
      return remoteHead
    }

    const candidates = ['main', 'master', 'origin/main', 'origin/master']

    for (const candidate of candidates) {
      const result = await this.#tryRun(
        ['rev-parse', '--verify', '--quiet', candidate], repositoryPath
      )

      if (result !== undefined) {
        return candidate
      }
    }

    throw new Error('Difftale could not detect a main or master base branch.')
  }

  public getCommitSubjectsBetween = async (
    repositoryPath: string,
    baseBranch: string
  ): Promise<string[]> => {
    const output = await this.#runner.run(
      ['log', '--format=%s', `${baseBranch}..HEAD`], repositoryPath
    )

    return output
      .split('\n')
      .map(subject => subject.trim())
      .filter(Boolean)
  }

  public getPullRequestDiff = async (
    repositoryPath: string,
    baseBranch: string
  ): Promise<string> => this.#runner.run(
    ['diff', '--no-ext-diff', '--unified=3', `${baseBranch}...HEAD`], repositoryPath
  )

  public getStagedDiff = async (repositoryPath: string): Promise<string> => this.#runner.run(['diff', '--cached', '--no-ext-diff', '--unified=3'], repositoryPath)

  public getStagedFilePaths = async (repositoryPath: string): Promise<string[]> => {
    const output = await this.#runner.run(
      ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], repositoryPath
    )

    return output
      .split('\n')
      .map(filePath => filePath.trim())
      .filter(Boolean)
  }

  public getChangedFilePaths = async (repositoryPath: string): Promise<string[]> => {
    const output = await this.#runner.run(
      ['status', '--porcelain=v1', '--untracked-files=all'], repositoryPath
    )

    return output
      .split('\n')
      .flatMap(line => {
        const filePath = line.slice(3).split(' -> ').at(-1)?.trim()

        return filePath ? [filePath] : []
      })
  }

  public getUnstagedFilePaths = async (repositoryPath: string): Promise<string[]> => {
    const output = await this.#runner.run(
      ['status', '--porcelain=v1', '--untracked-files=all'], repositoryPath
    )

    return output.split('\n').flatMap(line => {
      const indexStatus = line[0]
      const workingStatus = line[1]
      const filePath = line.slice(3).split(' -> ').at(-1)?.trim()
      const unstaged = workingStatus !== ' ' || indexStatus === '?'

      return unstaged && filePath ? [filePath] : []
    })
  }

  public stageFiles = async (
    repositoryPath: string,
    filePaths: readonly string[]
  ): Promise<void> => {
    if (filePaths.length > 0) {
      await this.#runner.run(['add', '--', ...filePaths], repositoryPath)
    }
  }

  public stageAllChanges = async (repositoryPath: string): Promise<void> => {
    await this.#runner.run(['add', '--all'], repositoryPath)
  }

  public unstageFiles = async (
    repositoryPath: string,
    filePaths: readonly string[]
  ): Promise<void> => {
    if (filePaths.length > 0) {
      await this.#runner.run(['restore', '--staged', '--', ...filePaths], repositoryPath)
    }
  }

  public hasWorkingChanges = async (
    repositoryPath: string,
    absoluteFilePath: string
  ): Promise<boolean> => {
    const relativeFilePath = normalizeGitPath(relative(repositoryPath, absoluteFilePath))

    const output = await this.#runner.run(
      ['status', '--porcelain=v1', '--untracked-files=all', '--', relativeFilePath], repositoryPath
    )

    return Boolean(output.trim())
  }
}
