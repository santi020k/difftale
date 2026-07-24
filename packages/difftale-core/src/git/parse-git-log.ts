import { GIT_FIELD_SEPARATOR, GIT_RECORD_SEPARATOR } from '../constants.js'
import type { GitRevision } from '../types.js'
import { normalizeGitPath } from '../utils/normalize-git-path.js'

interface ParsedFileStatus {
  existsAtRevision: boolean
  filePath: string
}

const parseFileStatus = (statusText: string): ParsedFileStatus | undefined => {
  const statusLine = statusText
    .split('\n')
    .map(line => line.trim())
    .find(Boolean)

  if (!statusLine) {
    return undefined
  }

  const [status = '', firstPath, secondPath] = statusLine.split('\t')
  const filePath = status.startsWith('R') || status.startsWith('C') ? secondPath : firstPath

  if (!filePath) {
    return undefined
  }

  return {
    existsAtRevision: !status.startsWith('D'),
    filePath: normalizeGitPath(filePath),
  }
}

export const parseGitLog = (output: string): GitRevision[] =>
  output
    .split(GIT_RECORD_SEPARATOR)
    .map(record => record.trim())
    .filter(Boolean)
    .flatMap(record => {
      const [
        hash,
        shortHash,
        author,
        authoredAt,
        subject,
        body = '',
        statusText = '',
      ] = record.split(GIT_FIELD_SEPARATOR)

      const fileStatus = parseFileStatus(statusText)

      if (!hash || !shortHash || !author || !authoredAt || !subject || !fileStatus) {
        return []
      }

      return [
        {
          author,
          authoredAt,
          body: body.trim(),
          existsAtRevision: fileStatus.existsAtRevision,
          filePath: fileStatus.filePath,
          hash,
          shortHash,
          subject,
        },
      ]
    })
