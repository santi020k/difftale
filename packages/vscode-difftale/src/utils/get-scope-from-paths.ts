import { basename, extname } from 'node:path'

const ROOT_FOLDER_NAMES = new Set(['apps', 'packages', 'src'])

export const getScopeFromPaths = (filePaths: readonly string[]): string | undefined => {
  if (filePaths.length === 0) {
    return undefined
  }

  const pathSegments = filePaths.map(filePath => filePath.split('/').filter(Boolean))
  const firstSegments = pathSegments[0]

  if (!firstSegments) {
    return undefined
  }

  const sharedSegments = firstSegments.filter((segment, index) =>
    pathSegments.every(segments => segments[index] === segment),
  )

  const rootIndex = sharedSegments.findIndex(segment => ROOT_FOLDER_NAMES.has(segment))
  const segmentAfterRoot = rootIndex >= 0 ? sharedSegments[rootIndex + 1] : sharedSegments[0]

  if (segmentAfterRoot) {
    return segmentAfterRoot.toLowerCase()
  }

  if (filePaths.length === 1) {
    const fileName = basename(filePaths[0] ?? '', extname(filePaths[0] ?? ''))

    return fileName || undefined
  }

  return undefined
}
