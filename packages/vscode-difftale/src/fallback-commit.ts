import type { ConventionalCommit } from '@santi020k/difftale-core'

import { getScopeFromPaths } from './utils/get-scope-from-paths'

const DOCUMENTATION_EXTENSIONS = new Set(['.md', '.mdx', '.txt'])
const TEST_FILE_PATTERN = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:spec|test)\.[^/]+$/

const getExtension = (filePath: string): string => {
  const extensionIndex = filePath.lastIndexOf('.')

  return extensionIndex >= 0 ? filePath.slice(extensionIndex) : ''
}

export const createFallbackCommit = (filePaths: readonly string[]): ConventionalCommit => {
  const scope = getScopeFromPaths(filePaths)
  const allDocumentation = filePaths.every(filePath => DOCUMENTATION_EXTENSIONS.has(getExtension(filePath)))
  const allTests = filePaths.every(filePath => TEST_FILE_PATTERN.test(filePath))
  let type = 'chore'

  if (allDocumentation) {
    type = 'docs'
  } else if (allTests) {
    type = 'test'
  }

  const subjectTarget = scope ?? 'project'

  return {
    body: `Update ${filePaths.length} staged ${filePaths.length === 1 ? 'file' : 'files'} in ${subjectTarget}.`,
    breaking: false,
    scope,
    summary: `update ${subjectTarget}`,
    type
  }
}
