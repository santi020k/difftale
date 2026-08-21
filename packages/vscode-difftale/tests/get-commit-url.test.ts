import { describe, expect, test } from 'vitest'

import { getCommitUrl } from '../src/utils/get-commit-url'

describe('getCommitUrl', () => {
  test('creates a GitHub commit URL from an SSH remote', () => {
    expect(getCommitUrl('git@github.com:owner/project.git', 'abc123')).toBe(
      'https://github.com/owner/project/commit/abc123'
    )
  })

  test('uses the Bitbucket commits route', () => {
    expect(getCommitUrl('https://bitbucket.org/owner/project.git', 'abc123')).toBe(
      'https://bitbucket.org/owner/project/commits/abc123'
    )
  })

  test('does not treat lookalike hosts as Bitbucket', () => {
    expect(getCommitUrl('https://bitbucket.org.example.com/owner/project.git', 'abc123')).toBe(
      'https://bitbucket.org.example.com/owner/project/commit/abc123'
    )
  })

  test('normalizes a trailing DNS dot for Bitbucket remotes', () => {
    expect(getCommitUrl('git@bitbucket.org.:owner/project.git', 'abc123')).toBe(
      'https://bitbucket.org/owner/project/commits/abc123'
    )
  })
})
