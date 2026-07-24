import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, test } from 'vitest'

import { GitRepository } from '../src/index.js'

const temporaryDirectories: string[] = []

const runGit = (repositoryPath: string, arguments_: string[]): void => {
  execFileSync('git', arguments_, {
    cwd: repositoryPath,
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

const createRepository = (): string => {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'difftale-core-'))
  temporaryDirectories.push(repositoryPath)
  runGit(repositoryPath, ['init'])
  runGit(repositoryPath, ['config', 'user.email', 'tests@difftale.dev'])
  runGit(repositoryPath, ['config', 'user.name', 'Difftale Tests'])
  mkdirSync(join(repositoryPath, 'src'))

  return repositoryPath
}

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
})

describe('GitRepository', () => {
  test('returns pull request context from a feature branch', async () => {
    const repositoryPath = createRepository()
    const filePath = join(repositoryPath, 'src', 'feature.ts')
    writeFileSync(filePath, 'export const enabled = false\n')
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add feature flag'])
    runGit(repositoryPath, ['branch', '-M', 'main'])
    runGit(repositoryPath, ['checkout', '-b', 'feature/composer'])
    writeFileSync(filePath, 'export const enabled = true\n')
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(pr): add pull request composer'])

    const repository = new GitRepository()

    await expect(repository.getCurrentBranch(repositoryPath)).resolves.toBe(
      'feature/composer',
    )
    await expect(repository.getDefaultBaseBranch(repositoryPath)).resolves.toBe('main')
    await expect(
      repository.getCommitSubjectsBetween(repositoryPath, 'main'),
    ).resolves.toEqual(['feat(pr): add pull request composer'])
    await expect(repository.getPullRequestDiff(repositoryPath, 'main')).resolves.toContain(
      'export const enabled = true',
    )
    await expect(repository.getBranches(repositoryPath)).resolves.toEqual([
      'feature/composer',
      'main',
    ])
  })

  test('returns the preferred remote URL', async () => {
    const repositoryPath = createRepository()
    runGit(repositoryPath, ['remote', 'add', 'backup', 'git@example.com:backup/repo.git'])
    runGit(repositoryPath, ['remote', 'add', 'origin', 'git@example.com:owner/repo.git'])

    const repository = new GitRepository()

    await expect(repository.getRemoteUrl(repositoryPath)).resolves.toBe(
      'git@example.com:owner/repo.git',
    )
  })

  test('returns staged changes and recent subjects', async () => {
    const repositoryPath = createRepository()
    const filePath = join(repositoryPath, 'src', 'feature.ts')
    writeFileSync(filePath, 'export const enabled = false\n')
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add feature flag'])
    writeFileSync(filePath, 'export const enabled = true\n')
    runGit(repositoryPath, ['add', '.'])

    const repository = new GitRepository()

    await expect(repository.getStagedDiff(repositoryPath)).resolves.toContain(
      'export const enabled = true',
    )
    await expect(repository.getStagedFilePaths(repositoryPath)).resolves.toEqual([
      'src/feature.ts',
    ])
    await expect(repository.getRecentCommitSubjects(repositoryPath)).resolves.toEqual([
      'feat(core): add feature flag',
    ])
  })

  test('returns no recent subjects before the first commit', async () => {
    const repositoryPath = createRepository()
    writeFileSync(
      join(repositoryPath, 'src', 'feature.ts'),
      'export const enabled = true\n',
    )
    runGit(repositoryPath, ['add', '.'])

    const repository = new GitRepository()

    await expect(repository.getRecentCommitSubjects(repositoryPath)).resolves.toEqual([])
  })

  test('reports commits ahead of the tracked branch', async () => {
    const repositoryPath = createRepository()
    const remotePath = mkdtempSync(join(tmpdir(), 'difftale-core-remote-'))
    temporaryDirectories.push(remotePath)
    const filePath = join(repositoryPath, 'src', 'feature.ts')
    writeFileSync(filePath, 'export const enabled = false\n')
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add feature flag'])
    runGit(repositoryPath, ['branch', '-M', 'main'])
    runGit(remotePath, ['init', '--bare'])
    runGit(repositoryPath, ['remote', 'add', 'origin', remotePath])
    runGit(repositoryPath, ['push', '--set-upstream', 'origin', 'main'])
    writeFileSync(filePath, 'export const enabled = true\n')
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): enable feature'])

    const repository = new GitRepository()

    await expect(repository.getBranchSyncStatus(repositoryPath)).resolves.toEqual({
      aheadCount: 1,
      behindCount: 0,
      branch: 'main',
      publishRequired: false,
      remoteName: 'origin',
      upstreamBranch: 'origin/main',
    })
  })

  test('reports a committed branch that needs to be published', async () => {
    const repositoryPath = createRepository()
    const remotePath = mkdtempSync(join(tmpdir(), 'difftale-core-remote-'))
    temporaryDirectories.push(remotePath)
    writeFileSync(
      join(repositoryPath, 'src', 'feature.ts'),
      'export const enabled = true\n',
    )
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add feature'])
    runGit(repositoryPath, ['branch', '-M', 'feature'])
    runGit(remotePath, ['init', '--bare'])
    runGit(repositoryPath, ['remote', 'add', 'origin', remotePath])

    const repository = new GitRepository()

    await expect(repository.getBranchSyncStatus(repositoryPath)).resolves.toEqual({
      aheadCount: 0,
      behindCount: 0,
      branch: 'feature',
      publishRequired: true,
      remoteName: 'origin',
    })
  })

  test('lists changed files and stages all changes explicitly', async () => {
    const repositoryPath = createRepository()
    const trackedFilePath = join(repositoryPath, 'src', 'tracked.ts')
    const untrackedFilePath = join(repositoryPath, 'src', 'untracked.ts')
    writeFileSync(trackedFilePath, 'export const value = 1\n')
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add tracked file'])
    writeFileSync(trackedFilePath, 'export const value = 2\n')
    writeFileSync(untrackedFilePath, 'export const added = true\n')

    const repository = new GitRepository()

    await expect(repository.getChangedFilePaths(repositoryPath)).resolves.toEqual([
      'src/tracked.ts',
      'src/untracked.ts',
    ])
    await expect(repository.getUnstagedFilePaths(repositoryPath)).resolves.toEqual([
      'src/tracked.ts',
      'src/untracked.ts',
    ])

    await repository.stageFiles(repositoryPath, ['src/tracked.ts'])

    await expect(repository.getStagedFilePaths(repositoryPath)).resolves.toEqual([
      'src/tracked.ts',
    ])

    await repository.stageAllChanges(repositoryPath)

    await expect(repository.getStagedFilePaths(repositoryPath)).resolves.toEqual([
      'src/tracked.ts',
      'src/untracked.ts',
    ])

    await repository.unstageFiles(repositoryPath, ['src/tracked.ts'])

    await expect(repository.getStagedFilePaths(repositoryPath)).resolves.toEqual([
      'src/untracked.ts',
    ])
    await expect(repository.getUnstagedFilePaths(repositoryPath)).resolves.toEqual([
      'src/tracked.ts',
    ])
  })

  test('follows renames and reads content using each historical path', async () => {
    const repositoryPath = createRepository()
    const originalPath = join(repositoryPath, 'src', 'original.ts')
    const renamedPath = join(repositoryPath, 'src', 'renamed.ts')
    writeFileSync(
      originalPath,
      [
        'export const name = "difftale"',
        'export const enabled = true',
        'export const version = 1',
        '',
      ].join('\n'),
    )
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add original file'])
    renameSync(originalPath, renamedPath)
    writeFileSync(
      renamedPath,
      [
        'export const name = "difftale"',
        'export const enabled = true',
        'export const version = 2',
        '',
      ].join('\n'),
    )
    runGit(repositoryPath, ['add', '.'])
    runGit(repositoryPath, ['commit', '-m', 'refactor(core): rename original file'])

    const repository = new GitRepository()
    const history = await repository.getFileHistory(repositoryPath, renamedPath)

    expect(history).toHaveLength(2)
    expect(history[0]?.filePath).toBe('src/renamed.ts')
    expect(history[1]?.filePath).toBe('src/original.ts')
    const originalRevision = history[1]

    expect(originalRevision).toBeDefined()

    if (!originalRevision) {
      throw new Error('The original revision is required.')
    }

    await expect(repository.getFileAtRevision(repositoryPath, originalRevision)).resolves.toContain(
      'version = 1',
    )
  })
})
