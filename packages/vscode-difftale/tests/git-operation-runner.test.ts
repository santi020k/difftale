import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, test } from 'vitest'

import { detectGitHooks } from '../src/git/detect-git-hooks'
import { GitOperationRunner } from '../src/git/git-operation-runner'

const temporaryDirectories: string[] = []

const runGit = (repositoryPath: string, arguments_: string[]): string =>
  execFileSync('git', arguments_, {
    cwd: repositoryPath,
    encoding: 'utf8',
    stdio: 'pipe',
  })

const createRepository = (): string => {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'difftale-operation-'))
  temporaryDirectories.push(repositoryPath)
  runGit(repositoryPath, ['init'])
  runGit(repositoryPath, ['config', 'user.email', 'tests@difftale.dev'])
  runGit(repositoryPath, ['config', 'user.name', 'Difftale Tests'])
  mkdirSync(join(repositoryPath, 'src'))
  writeFileSync(join(repositoryPath, 'src', 'feature.ts'), 'export const enabled = true\n')
  runGit(repositoryPath, ['add', '.'])

  return repositoryPath
}

const createHook = (
  repositoryPath: string,
  hookName: 'pre-commit' | 'pre-push',
  script: string,
): string => {
  const hookPath = join(repositoryPath, '.git', 'hooks', hookName)
  writeFileSync(hookPath, `#!/bin/sh\n${script}\n`)
  chmodSync(hookPath, 0o755)

  return hookPath
}

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    rmSync(temporaryDirectory, { force: true, recursive: true })
  }
})

describe('GitOperationRunner', () => {
  test('streams a passing pre-commit hook and creates the commit', async () => {
    const repositoryPath = createRepository()
    createHook(repositoryPath, 'pre-commit', 'echo "pre-commit checks passed"')
    const streamedOutput: string[] = []
    const runner = new GitOperationRunner()
    const result = await runner.run(
      {
        arguments: ['commit', '--file=-'],
        input: 'feat(core): add feature\n',
        kind: 'commit',
        repositoryPath,
      },
      {
        onOutput: output => streamedOutput.push(output),
      },
    )

    expect(result.succeeded).toBe(true)
    expect(result.output).toContain('pre-commit checks passed')
    expect(streamedOutput.join('')).toContain('pre-commit checks passed')
    expect(runGit(repositoryPath, ['log', '-1', '--format=%s']).trim()).toBe(
      'feat(core): add feature',
    )
  })

  test('reports a hook failure without creating a commit', async () => {
    const repositoryPath = createRepository()
    createHook(repositoryPath, 'pre-commit', 'echo "lint failed" >&2\nexit 7')
    const runner = new GitOperationRunner()
    const result = await runner.run({
      arguments: ['commit', '--file=-'],
      input: 'feat(core): add feature\n',
      kind: 'commit',
      repositoryPath,
    })

    expect(result.succeeded).toBe(false)
    expect(result.output).toContain('lint failed')
    expect(runGit(repositoryPath, ['status', '--short'])).toContain('A  src/feature.ts')
  })

  test('streams pre-push output from the real push operation', async () => {
    const repositoryPath = createRepository()
    const remotePath = mkdtempSync(join(tmpdir(), 'difftale-remote-'))
    temporaryDirectories.push(remotePath)
    runGit(remotePath, ['init', '--bare'])
    runGit(repositoryPath, ['commit', '-m', 'feat(core): add feature'])
    runGit(repositoryPath, ['branch', '-M', 'main'])
    runGit(repositoryPath, ['remote', 'add', 'origin', remotePath])
    createHook(repositoryPath, 'pre-push', 'echo "pre-push checks passed"')
    const runner = new GitOperationRunner()
    const result = await runner.run({
      arguments: ['push', '--set-upstream', 'origin', 'main'],
      kind: 'push',
      repositoryPath,
    })

    expect(result.succeeded).toBe(true)
    expect(result.output).toContain('pre-push checks passed')
    expect(runGit(remotePath, ['rev-parse', 'refs/heads/main']).trim()).toMatch(/^[\da-f]{40}$/)
  })

  test('detects executable native Git hooks', async () => {
    const repositoryPath = createRepository()
    const hookPath = createHook(repositoryPath, 'pre-push', 'echo "push checks"')

    await expect(detectGitHooks(repositoryPath, ['pre-push'])).resolves.toEqual([
      {
        exists: true,
        name: 'pre-push',
        path: hookPath,
      },
    ])
  })

  test('detects hooks in a configured core hooks path', async () => {
    const repositoryPath = createRepository()
    const hooksDirectory = join(repositoryPath, '.husky', '_')
    mkdirSync(hooksDirectory, { recursive: true })
    runGit(repositoryPath, ['config', 'core.hooksPath', '.husky/_'])
    const hookPath = join(hooksDirectory, 'pre-commit')
    writeFileSync(hookPath, '#!/bin/sh\necho "husky checks"\n')
    chmodSync(hookPath, 0o755)

    await expect(detectGitHooks(repositoryPath, ['pre-commit'])).resolves.toEqual([
      {
        exists: true,
        name: 'pre-commit',
        path: hookPath,
      },
    ])
  })
})
