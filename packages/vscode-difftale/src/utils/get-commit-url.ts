const normalizeRemoteUrl = (remoteUrl: string): URL | undefined => {
  const scpMatch = remoteUrl.includes('://') ?
    undefined :
    /^(?:[^@]+@)?(?<host>[^:]+):(?<path>.+)$/u.exec(remoteUrl)

  try {
    const host = scpMatch?.groups?.host
    const path = scpMatch?.groups?.path

    if (host && path) {
      return new URL(`https://${host}/${path}`)
    }

    const parsedUrl = new URL(remoteUrl)

    return new URL(`https://${parsedUrl.hostname}${parsedUrl.pathname}`)
  } catch {
    return undefined
  }
}

export const getCommitUrl = (
  remoteUrl: string,
  commitHash: string
): string | undefined => {
  const repositoryUrl = normalizeRemoteUrl(remoteUrl)

  if (!repositoryUrl) return undefined

  repositoryUrl.pathname = repositoryUrl.pathname.replace(/\.git$/u, '')

  const commitSegment = repositoryUrl.hostname.includes('bitbucket.org') ?
    'commits' :
    'commit'

  repositoryUrl.pathname = `${repositoryUrl.pathname}/${commitSegment}/${commitHash}`

  return repositoryUrl.toString()
}
