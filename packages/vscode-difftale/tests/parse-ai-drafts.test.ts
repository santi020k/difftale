import { describe, expect, test } from 'vitest'

import { parseAiDrafts } from '../src/ai/parse-ai-drafts'

describe('parseAiDrafts', () => {
  test('parses structured JSON and removes duplicate drafts', () => {
    const response = JSON.stringify({
      drafts: [
        {
          body: 'Persist state before redirecting.',
          breaking: false,
          footer: '',
          scope: 'checkout',
          summary: 'preserve cart state',
          type: 'feat'
        },
        {
          body: 'Persist state before redirecting.',
          breaking: false,
          footer: '',
          scope: 'checkout',
          summary: 'preserve cart state',
          type: 'feat'
        }
      ]
    })

    expect(parseAiDrafts(response)).toEqual([
      {
        body: 'Persist state before redirecting.',
        breaking: false,
        footer: '',
        scope: 'checkout',
        summary: 'preserve cart state',
        type: 'feat'
      }
    ])
  })

  test('accepts plain Conventional Commit alternatives', () => {
    const response = [
      'fix(history): follow renamed files',
      '',
      'Resolve the historical path before loading content.',
      '---',
      'refactor(history): simplify revision lookup'
    ].join('\n')

    expect(parseAiDrafts(response)).toHaveLength(2)
  })
})
