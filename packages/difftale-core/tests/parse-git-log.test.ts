import { describe, expect, test } from 'vitest'

import { parseGitLog } from '../src/index.js'

describe('parseGitLog', () => {
  test('uses the destination path for a rename revision', () => {
    const output = [
      '\u001eabc123\u001fabc123\u001fSantiago\u001f2026-07-23T20:00:00-05:00\u001frefactor: rename file\u001fExplain rename\u001f',
      '\nR100\tsrc/old-name.ts\tsrc/new-name.ts\n',
    ].join('')

    expect(parseGitLog(output)).toEqual([
      {
        author: 'Santiago',
        authoredAt: '2026-07-23T20:00:00-05:00',
        body: 'Explain rename',
        existsAtRevision: true,
        filePath: 'src/new-name.ts',
        hash: 'abc123',
        shortHash: 'abc123',
        subject: 'refactor: rename file',
      },
    ])
  })

  test('marks deleted revisions as empty', () => {
    const output =
      '\u001edeadbeef\u001fdeadbee\u001fSantiago\u001f2026-07-23T20:00:00-05:00\u001fchore: remove file\u001f\u001f\nD\tsrc/file.ts\n'

    expect(parseGitLog(output)[0]?.existsAtRevision).toBe(false)
  })
})
