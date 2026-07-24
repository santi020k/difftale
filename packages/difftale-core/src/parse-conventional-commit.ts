import type { ConventionalCommit } from './types.js'

const HEADER_PATTERN = /^(?<type>[a-z][a-z0-9-]*)(?:\((?<scope>[^()\r\n]+)\))?(?<breaking>!)?: (?<summary>[^\r\n]+)$/
const FOOTER_PATTERN = /^(?:BREAKING CHANGE|[A-Za-z-]+)(?:: | #)/

export const parseConventionalCommit = (message: string): ConventionalCommit | undefined => {
  const normalizedMessage = message.replaceAll('\r\n', '\n').trim()
  const [header = '', ...remainingSections] = normalizedMessage.split(/\n{2,}/)
  const match = HEADER_PATTERN.exec(header)

  if (!match?.groups) {
    return undefined
  }

  const lastSection = remainingSections.at(-1)
  const hasFooter = Boolean(lastSection && FOOTER_PATTERN.test(lastSection))
  const bodySections = hasFooter ? remainingSections.slice(0, -1) : remainingSections

  return {
    body: bodySections.length > 0 ? bodySections.join('\n\n') : undefined,
    breaking: Boolean(match.groups.breaking),
    footer: hasFooter ? lastSection : undefined,
    scope: match.groups.scope,
    summary: match.groups.summary ?? '',
    type: match.groups.type ?? '',
  }
}
