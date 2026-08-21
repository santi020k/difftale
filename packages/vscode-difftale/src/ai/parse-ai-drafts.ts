import {
  type ConventionalCommit,
  formatConventionalCommit,
  parseConventionalCommit
} from '@santi020k/difftale-core'

import { getOptionalBoolean, getRecordArray, getString } from '../utils/get-string'
import { isRecord } from '../utils/is-record'

const removeCodeFence = (response: string): string => response
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/, '')

const parseJsonDrafts = (response: string): ConventionalCommit[] => {
  try {
    const parsedResponse: unknown = JSON.parse(removeCodeFence(response))

    if (!isRecord(parsedResponse)) {
      return []
    }

    return getRecordArray(parsedResponse, 'drafts').flatMap(draft => {
      const type = getString(draft, 'type')
      const summary = getString(draft, 'summary')

      if (!type || !summary) {
        return []
      }

      return [
        {
          body: getString(draft, 'body'),
          breaking: getOptionalBoolean(draft, 'breaking') ?? false,
          footer: getString(draft, 'footer'),
          scope: getString(draft, 'scope'),
          summary,
          type
        }
      ]
    })
  } catch {
    return []
  }
}

const parsePlainTextDrafts = (response: string): ConventionalCommit[] => removeCodeFence(response)
  .split(/\n-{3,}\n/)
  .map(message => parseConventionalCommit(message))
  .filter(commit => commit !== undefined)

export const parseAiDrafts = (response: string): ConventionalCommit[] => {
  const jsonDrafts = parseJsonDrafts(response)
  const drafts = jsonDrafts.length > 0 ? jsonDrafts : parsePlainTextDrafts(response)
  const uniqueMessages = new Set<string>()

  return drafts.filter(draft => {
    const message = formatConventionalCommit(draft)

    if (uniqueMessages.has(message)) {
      return false
    }

    uniqueMessages.add(message)

    return true
  })
}
