import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'

import type { GitOperationRequest, GitOperationResult } from '../types'

interface GitOperationRunnerOptions {
  abortSignal?: AbortSignal
  onOutput?: (output: string) => void
}

export class GitOperationRunner {
  public run = async (
    request: GitOperationRequest,
    options: GitOperationRunnerOptions = {},
  ): Promise<GitOperationResult> =>
    new Promise((resolve, reject) => {
      const startedAt = performance.now()
      const outputChunks: string[] = []
      let cancelled = false
      let settled = false

      const childProcess = spawn('git', [...request.arguments], {
        cwd: request.repositoryPath,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const appendOutput = (chunk: Buffer): void => {
        const output = chunk.toString()

        outputChunks.push(output)

        options.onOutput?.(output)
      }

      const handleAbort = (): void => {
        cancelled = true

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

        resolve({
          cancelled,
          durationMilliseconds: Math.round(performance.now() - startedAt),
          exitCode,
          output: outputChunks.join(''),
          succeeded: exitCode === 0,
        })
      })

      childProcess.stdin.end(request.input)
    })
}
