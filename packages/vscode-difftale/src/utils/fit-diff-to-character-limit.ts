const TRUNCATION_MARKER = '\n... [diff truncated by Difftale]\n'

const splitDiffSections = (diff: string): string[] => {
  const sectionStarts = [...diff.matchAll(/^diff --git /gmu)].map(match => match.index)

  if (sectionStarts.length <= 1) {
    return [diff]
  }

  return sectionStarts.map((start, index) => diff.slice(start, sectionStarts[index + 1] ?? diff.length))
}

export const getDiffFilePaths = (diff: string): string[] => [
  ...new Set(
    [...diff.matchAll(/^\+\+\+ (?:b\/)?(?<filePath>.+)$/gmu)]
      .flatMap(match => {
        const filePath = match.groups?.filePath?.replaceAll(/^"|"$/gu, '')

        return filePath && filePath !== '/dev/null' ? [filePath] : []
      })
  )
]

const truncateAtLineBoundary = (value: string, maximumLength: number): string => {
  if (value.length <= maximumLength) {
    return value
  }

  const candidate = value.slice(0, maximumLength)
  const lastLineBreak = candidate.lastIndexOf('\n')

  return lastLineBreak > 0 ? candidate.slice(0, lastLineBreak + 1) : candidate
}

export const fitDiffToCharacterLimit = (
  diff: string,
  maximumLength: number
): string => {
  if (diff.length <= maximumLength) {
    return diff
  }

  if (maximumLength <= TRUNCATION_MARKER.length) {
    return truncateAtLineBoundary(diff, maximumLength)
  }

  const sections = splitDiffSections(diff)
  const contentBudget = maximumLength - TRUNCATION_MARKER.length
  const sectionBudget = Math.floor(contentBudget / sections.length)
  let remainingBudget = contentBudget

  const selectedSections = sections.map((section, index) => {
    const remainingSections = sections.length - index

    const maximumSectionLength = Math.max(
      sectionBudget, Math.floor(remainingBudget / remainingSections)
    )

    const selected = truncateAtLineBoundary(section, maximumSectionLength)

    remainingBudget -= selected.length

    return selected.trimEnd()
  })

  return `${selectedSections.filter(Boolean).join('\n')}${TRUNCATION_MARKER}`.slice(
    0, maximumLength
  )
}
