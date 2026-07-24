import { GitRepository } from '@santi020k/difftale-core'

import { describe, expect, test } from 'vitest'

import { RevisionContentProvider } from '../src/revision-content-provider'

describe('RevisionContentProvider', () => {
  test('creates resolvable empty revision URIs', async () => {
    const provider = new RevisionContentProvider(new GitRepository())
    const uri = provider.createEmptyUri('/repository/src/file.ts', '/repository')

    expect(uri.scheme).toBe('difftale-revision')
    expect(provider.getOriginalFilePath(uri)).toBe('/repository/src/file.ts')
    await expect(provider.provideTextDocumentContent(uri)).resolves.toBe('')
  })
})
