import { describe, expect, test } from 'vitest'

import { parsePullRequestDraft } from '../src/ai/parse-pull-request-draft'

describe('parsePullRequestDraft', () => {
  test('parses strict JSON and removes surrounding whitespace', () => {
    expect(
      parsePullRequestDraft(
        '{"title":" feat(pr): add composer ","description":" ## Summary\\n- Add it "}',
      ),
    ).toEqual({
      description: '## Summary\n- Add it',
      title: 'feat(pr): add composer',
    })
  })

  test('parses a fenced JSON response', () => {
    expect(
      parsePullRequestDraft(
        '```json\n{"title":"fix(pr): preserve draft","description":"## Summary\\n- Preserve it"}\n```',
      ),
    ).toEqual({
      description: '## Summary\n- Preserve it',
      title: 'fix(pr): preserve draft',
    })
  })

  test('rejects incomplete or malformed drafts', () => {
    expect(parsePullRequestDraft('{"title":"feat: missing description"}')).toBeUndefined()
    expect(parsePullRequestDraft('not json')).toBeUndefined()
  })
})
