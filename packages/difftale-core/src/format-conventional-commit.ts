import { normalizeMessageSection } from './utils/normalize-message-section.js'
import type { ConventionalCommit } from './types.js'

export const formatConventionalCommit = (commit: ConventionalCommit): string => {
  const scope = commit.scope?.trim()
  const breakingMarker = commit.breaking ? '!' : ''
  const header = `${commit.type.trim()}${scope ? `(${scope})` : ''}${breakingMarker}: ${commit.summary.trim()}`
  const body = normalizeMessageSection(commit.body)
  const footer = normalizeMessageSection(commit.footer)

  return [header, body, footer].filter(section => section !== undefined).join('\n\n')
}
