import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { afterEach, describe, expect, test } from 'vitest'

import { GitAskpassBridge } from '../src/git/git-askpass-bridge'

const executeFile = promisify(execFile)
const bridges: GitAskpassBridge[] = []

afterEach(async () => {
  await Promise.all(bridges.splice(0).map(async bridge => bridge.dispose()))
})

describe('GitAskpassBridge', () => {
  test('returns a credential from the prompt without placing it in arguments', async () => {
    const prompts: string[] = []
    const bridge = await GitAskpassBridge.create({
      onPrompt: prompt => {
        prompts.push(prompt)

        return Promise.resolve('correct horse battery staple')
      },
    })
    bridges.push(bridge)

    const result = await executeFile(
      bridge.executablePath,
      ['Enter passphrase for key /home/user/.ssh/id_ed25519:'],
      {
        env: {
          ...process.env,
          ...bridge.environment,
        },
      },
    )

    expect(prompts).toEqual([
      'Enter passphrase for key /home/user/.ssh/id_ed25519:',
    ])
    expect(result.stdout).toBe('correct horse battery staple')
  })

  test('exits unsuccessfully when the prompt is cancelled', async () => {
    const credentials: string[] = []

    const bridge = await GitAskpassBridge.create({
      onPrompt: () => Promise.resolve(credentials[0]),
    })
    bridges.push(bridge)

    await expect(
      executeFile(bridge.executablePath, ['Password:'], {
        env: {
          ...process.env,
          ...bridge.environment,
        },
      }),
    ).rejects.toMatchObject({
      code: 1,
    })
  })
})
