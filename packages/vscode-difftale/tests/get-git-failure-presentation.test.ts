import { describe, expect, test } from 'vitest'

import { getGitFailurePresentation } from '../src/git/get-git-failure-presentation'

describe('getGitFailurePresentation', () => {
  test('surfaces a specific exception ahead of generic hook failures', () => {
    const presentation = getGitFailurePresentation({
      hookNames: ['pre-commit'],
      kind: 'commit',
      result: {
        cancelled: false,
        durationMilliseconds: 1_500,
        exitCode: 1,
        output: [
          'TypeError: Cannot read properties of undefined',
          '    at Object.<anonymous> (/project/node_modules/example.js:45:18)',
          'ELIFECYCLE Command failed with exit code 1.',
          'husky - pre-commit script failed (code 1)',
        ].join('\n'),
        succeeded: false,
      },
    })

    expect(presentation.title).toBe('Commit blocked during pre-commit')
    expect(presentation.summary).toBe(
      'TypeError: Cannot read properties of undefined',
    )
    expect(presentation.details).toContain('husky - pre-commit script failed')
  })

  test('uses a descriptive hook line when no exception type is available', () => {
    const presentation = getGitFailurePresentation({
      hookNames: ['pre-push'],
      kind: 'push',
      result: {
        cancelled: false,
        durationMilliseconds: 200,
        exitCode: 7,
        output: 'lint failed\nhusky - pre-push script failed (code 7)\n',
        succeeded: false,
      },
    })

    expect(presentation.title).toBe('Push blocked during pre-push')
    expect(presentation.summary).toBe('lint failed')
  })
})
