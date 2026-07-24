import { spawn } from 'node:child_process'

import type {
  PullRequestCreationRequest,
  PullRequestCreationResult,
} from '../types'

interface GitHubPullRequestServiceOptions {
  abortSignal?: AbortSignal
  onOutput?: (output: string) => void
}

const getPullRequestUrl = (output: string): string | undefined =>
  output
    .split(/\s+/)
    .find(value => /^https:\/\/github\.com\/.+\/pull\/\d+$/.test(value))

export class GitHubPullRequestService {
  public create = async (
    request: PullRequestCreationRequest,
    options: GitHubPullRequestServiceOptions = {},
  ): Promise<PullRequestCreationResult> =>
    new Promise((resolve, reject) => {
      const outputChunks: string[] = []
      let settled = false

      const childProcess = spawn(
        'gh',
        [
          'pr',
          'create',
          '--title',
          request.title,
          '--body',
          request.description,
          '--base',
          request.baseBranch,
          '--head',
          request.currentBranch,
        ],
        {
          cwd: request.repositoryPath,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )

      const appendOutput = (chunk: Buffer): void => {
        const output = chunk.toString()

        outputChunks.push(output)

        options.onOutput?.(output)
      }

      const handleAbort = (): void => {
        childProcess.kill()
      }

      options.abortSignal?.addEventListener('abort', handleAbort, { once: true })

      childProcess.stdout.on('data', appendOutput)

      childProcess.stderr.on('data', appendOutput)

      childProcess.on('error', error => {
        if (settled) {
          return
        }

        settled = true

        options.abortSignal?.removeEventListener('abort', handleAbort)

        reject(error)
      })

      childProcess.on('close', exitCode => {
        if (settled) {
          return
        }

        settled = true

        options.abortSignal?.removeEventListener('abort', handleAbort)

        const output = outputChunks.join('').trim()

        resolve({
          output,
          succeeded: exitCode === 0,
          url: getPullRequestUrl(output),
        })
      })
    })
}
