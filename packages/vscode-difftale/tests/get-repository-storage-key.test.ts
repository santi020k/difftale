import { describe, expect, test } from 'vitest'

import { getRepositoryStorageKey } from '../src/utils/get-repository-storage-key'

describe('getRepositoryStorageKey', () => {
  test('isolates state by repository and branch', () => {
    const first = getRepositoryStorageKey('draft', '/workspace/one', 'feature/one')
    const second = getRepositoryStorageKey('draft', '/workspace/two', 'feature/one')
    const third = getRepositoryStorageKey('draft', '/workspace/one', 'feature/two')

    expect(new Set([first, second, third])).toHaveLength(3)
    expect(first).toContain(encodeURIComponent('/workspace/one'))
    expect(first).toContain(encodeURIComponent('feature/one'))
  })
})
