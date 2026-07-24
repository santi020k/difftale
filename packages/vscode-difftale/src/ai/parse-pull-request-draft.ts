import type { PullRequestDraft } from '../types'
import { getString } from '../utils/get-string'
import { isRecord } from '../utils/is-record'

const removeCodeFence = (response: string): string =>
  response
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

export const parsePullRequestDraft = (
  response: string,
): PullRequestDraft | undefined => {
  try {
    const parsedResponse: unknown = JSON.parse(removeCodeFence(response))

    if (!isRecord(parsedResponse)) {
      return undefined
    }

    const title = getString(parsedResponse, 'title')?.trim()
    const description = getString(parsedResponse, 'description')?.trim()

    if (!title || !description) {
      return undefined
    }

    return { description, title }
  } catch {
    return undefined
  }
}
