import { randomBytes } from 'node:crypto'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

interface AskpassRequest {
  prompt: string
  token: string
}

interface GitAskpassBridgeOptions {
  onPrompt: (prompt: string) => Promise<string | undefined>
}

const ASKPASS_HELPER_SOURCE = `
const net = require('node:net')

const socket = net.createConnection({
  host: '127.0.0.1',
  port: Number(process.env.DIFFTALE_ASKPASS_PORT),
})
let response = ''

socket.on('connect', () => {
  socket.end(JSON.stringify({
    prompt: process.argv.slice(2).join(' '),
    token: process.env.DIFFTALE_ASKPASS_TOKEN,
  }))
})

socket.on('data', chunk => {
  response += chunk.toString()
})

socket.on('end', () => {
  try {
    const result = JSON.parse(response)

    if (result.cancelled || typeof result.value !== 'string') {
      process.exitCode = 1

      return
    }

    process.stdout.write(result.value)
  } catch {
    process.exitCode = 1
  }
})

socket.on('error', () => {
  process.exitCode = 1
})
`.trimStart()

const isAskpassRequest = (value: unknown): value is AskpassRequest => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return (
    'prompt' in value
    && typeof value.prompt === 'string'
    && 'token' in value
    && typeof value.token === 'string'
  )
}

const getWrapperSource = (): string =>
  process.platform === 'win32'
    ? [
        '@echo off',
        'set ELECTRON_RUN_AS_NODE=1',
        '"%DIFFTALE_ASKPASS_NODE%" "%DIFFTALE_ASKPASS_MAIN%" "%~1"',
        '',
      ].join('\r\n')
    : [
        '#!/bin/sh',
        'ELECTRON_RUN_AS_NODE=1 exec "$DIFFTALE_ASKPASS_NODE" "$DIFFTALE_ASKPASS_MAIN" "$@"',
        '',
      ].join('\n')

const listen = async (server: Server): Promise<number> =>
  new Promise((resolve, reject) => {
    const handleError = (error: Error): void => {
      reject(error)
    }

    server.once('error', handleError)

    server.listen(0, '127.0.0.1', () => {
      server.off('error', handleError)

      const address = server.address()

      if (!address || typeof address === 'string') {
        reject(new Error('Difftale could not start its Git authentication prompt.'))

        return
      }

      resolve(address.port)
    })
  })

export class GitAskpassBridge {
  readonly #directoryPath: string
  readonly #server: Server
  readonly #sockets: Set<Socket>

  public readonly environment: NodeJS.ProcessEnv
  public readonly executablePath: string

  private constructor(
    directoryPath: string,
    executablePath: string,
    server: Server,
    sockets: Set<Socket>,
    token: string,
    port: number,
  ) {
    this.#directoryPath = directoryPath

    this.#server = server

    this.#sockets = sockets

    this.executablePath = executablePath

    this.environment = {
      DIFFTALE_ASKPASS_MAIN: join(directoryPath, 'askpass-main.cjs'),
      DIFFTALE_ASKPASS_NODE: process.execPath,
      DIFFTALE_ASKPASS_PORT: String(port),
      DIFFTALE_ASKPASS_TOKEN: token,
      DISPLAY: process.env.DISPLAY || 'difftale',
      GIT_ASKPASS: executablePath,
      GIT_TERMINAL_PROMPT: '0',
      SSH_ASKPASS: executablePath,
      SSH_ASKPASS_REQUIRE: 'force',
    }
  }

  public static create = async (
    options: GitAskpassBridgeOptions,
  ): Promise<GitAskpassBridge> => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'difftale-askpass-'))
    const mainPath = join(directoryPath, 'askpass-main.cjs')

    const executablePath = join(
      directoryPath,
      process.platform === 'win32' ? 'askpass.cmd' : 'askpass',
    )

    const token = randomBytes(32).toString('hex')
    const server = createServer({ allowHalfOpen: true })
    const sockets = new Set<Socket>()

    server.on('connection', socket => {
      sockets.add(socket)

      socket.once('close', () => {
        sockets.delete(socket)
      })

      GitAskpassBridge.#handleConnection(socket, token, options.onPrompt)
    })

    try {
      await writeFile(mainPath, ASKPASS_HELPER_SOURCE, { mode: 0o600 })

      await writeFile(executablePath, getWrapperSource(), { mode: 0o700 })

      await chmod(executablePath, 0o700)

      const port = await listen(server)

      return new GitAskpassBridge(
        directoryPath,
        executablePath,
        server,
        sockets,
        token,
        port,
      )
    } catch (error) {
      server.close()

      await rm(directoryPath, { force: true, recursive: true })

      throw error
    }
  }

  static #handleConnection = (
    socket: Socket,
    token: string,
    onPrompt: (prompt: string) => Promise<string | undefined>,
  ): void => {
    let requestText = ''

    socket.on('data', chunk => {
      requestText += chunk.toString()
    })

    socket.on('end', () => {
      GitAskpassBridge.#respond(socket, requestText, token, onPrompt).catch(() => {
        socket.end(JSON.stringify({ cancelled: true }))
      })
    })
  }

  static #respond = async (
    socket: Socket,
    requestText: string,
    token: string,
    onPrompt: (prompt: string) => Promise<string | undefined>,
  ): Promise<void> => {
    try {
      const request: unknown = JSON.parse(requestText)

      if (!isAskpassRequest(request) || request.token !== token) {
        socket.end(JSON.stringify({ cancelled: true }))

        return
      }

      const value = await onPrompt(request.prompt)

      socket.end(
        JSON.stringify(
          value === undefined
            ? { cancelled: true }
            : { cancelled: false, value },
        ),
      )
    } catch {
      socket.end(JSON.stringify({ cancelled: true }))
    }
  }

  public dispose = async (): Promise<void> => {
    await new Promise<void>(resolve => {
      this.#server.close(() => {
        resolve()
      })

      for (const socket of this.#sockets) {
        socket.destroy()
      }
    })

    await rm(this.#directoryPath, { force: true, recursive: true })
  }
}
