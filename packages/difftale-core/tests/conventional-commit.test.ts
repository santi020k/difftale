import { describe, expect, test } from 'vitest'

import {
  formatConventionalCommit,
  parseConventionalCommit,
  validateConventionalCommit,
} from '../src/index.js'

describe('Conventional Commit utilities', () => {
  test('formats a complete commit message', () => {
    const message = formatConventionalCommit({
      body: 'Persist the checkout session before redirecting.',
      breaking: true,
      footer: 'BREAKING CHANGE: checkout sessions now require an identifier',
      scope: 'checkout',
      summary: 'preserve cart state during payment redirects',
      type: 'feat',
    })

    expect(message).toBe(
      [
        'feat(checkout)!: preserve cart state during payment redirects',
        'Persist the checkout session before redirecting.',
        'BREAKING CHANGE: checkout sessions now require an identifier',
      ].join('\n\n'),
    )
  })

  test('parses the header, body, and footer', () => {
    const parsedCommit = parseConventionalCommit(
      [
        'fix(history): follow renamed files',
        'Resolve the path used by each historical revision.',
        'Refs: #42',
      ].join('\n\n'),
    )

    expect(parsedCommit).toEqual({
      body: 'Resolve the path used by each historical revision.',
      breaking: false,
      footer: 'Refs: #42',
      scope: 'history',
      summary: 'follow renamed files',
      type: 'fix',
    })
  })

  test('rejects invalid types, punctuation, casing, and oversized headers', () => {
    const result = validateConventionalCommit('feature(core): Add parsing.', {
      maximumHeaderLengthCharacters: 20,
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      'Type "feature" is not allowed.',
      'Header exceeds 20 characters.',
      'Summary must not end with a period.',
      'Summary must begin with a lowercase character.',
    ])
  })

  test('requires a footer for breaking commits', () => {
    const result = validateConventionalCommit('feat(api)!: change response format')

    expect(result).toEqual({
      errors: ['Breaking commits must include a BREAKING CHANGE footer.'],
      valid: false,
    })
  })
})
