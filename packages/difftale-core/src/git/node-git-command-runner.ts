import { execFile } from 'node:child_process'

import { GIT_EXECUTION_BUFFER_BYTES } from '../constants.js'
import type { GitCommandRunner } from '../types.js'

export class NodeGitCommandRunner implements GitCommandRunner {
  public run = async (arguments_: readonly string[], repositoryPath?: string): Promise<string> =>
    new Promise((resolve, reject) => {
      execFile(
        'git',
        [...arguments_],
        {
          cwd: repositoryPath,
          encoding: 'utf8',
          maxBuffer: GIT_EXECUTION_BUFFER_BYTES,
        },
        (error, standardOutput, standardError) => {
          if (error) {
            reject(new Error(standardError.trim() || error.message))

            return
          }

          resolve(standardOutput)
        },
      )
    })
}
