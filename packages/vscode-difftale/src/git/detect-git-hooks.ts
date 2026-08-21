import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { promisify } from 'node:util'

import type { GitHook } from '../types'

const executeFile = promisify(execFile)

const runOptionalGitCommand = async (
  repositoryPath: string,
  arguments_: readonly string[]
): Promise<string | undefined> => {
  try {
    const { stdout } = await executeFile(
      'git', [...arguments_], {
        cwd: repositoryPath,
        encoding: 'utf8'
      }
    )

    return stdout.trim() || undefined
  } catch {
    return undefined
  }
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.X_OK)

    return true
  } catch {
    return false
  }
}

const resolveHooksDirectory = async (repositoryPath: string): Promise<string> => {
  const configuredHooksPath = await runOptionalGitCommand(
    repositoryPath, ['config', '--path', '--get', 'core.hooksPath']
  )

  if (configuredHooksPath) {
    return isAbsolute(configuredHooksPath) ?
      configuredHooksPath :
      resolve(repositoryPath, configuredHooksPath)
  }

  const gitHooksPath = await runOptionalGitCommand(
    repositoryPath, ['rev-parse', '--git-path', 'hooks']
  )

  return gitHooksPath && isAbsolute(gitHooksPath) ?
    gitHooksPath :
    resolve(repositoryPath, gitHooksPath ?? '.git/hooks')
}

export const detectGitHooks = async (
  repositoryPath: string,
  hookNames: readonly GitHook['name'][]
): Promise<GitHook[]> => {
  const hooksDirectory = await resolveHooksDirectory(repositoryPath)

  return Promise.all(
    hookNames.map(async name => {
      const path = resolve(hooksDirectory, name)

      return {
        exists: await fileExists(path),
        name,
        path
      }
    })
  )
}
