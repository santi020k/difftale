export const getRepositoryStorageKey = (
  baseKey: string,
  repositoryPath: string,
  branch: string,
): string =>
  [baseKey, encodeURIComponent(repositoryPath), encodeURIComponent(branch)].join(':')
