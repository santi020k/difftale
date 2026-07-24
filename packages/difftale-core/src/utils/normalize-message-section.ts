export const normalizeMessageSection = (value: string | undefined): string | undefined => {
  const normalizedValue = value
    ?.split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim()

  return normalizedValue || undefined
}
