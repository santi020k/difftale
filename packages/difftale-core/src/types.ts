export interface ConventionalCommit {
  body?: string
  breaking: boolean
  footer?: string
  scope?: string
  summary: string
  type: string
}

export interface CommitValidationOptions {
  allowedTypes?: readonly string[]
  maximumHeaderLengthCharacters?: number
}

export interface CommitValidationResult {
  errors: string[]
  valid: boolean
}

export interface GitRevision {
  author: string
  authoredAt: string
  body: string
  existsAtRevision: boolean
  filePath: string
  hash: string
  shortHash: string
  subject: string
}

export interface GitCommandRunner {
  run(arguments_: readonly string[], repositoryPath?: string): Promise<string>
}

export interface GitBranchSyncStatus {
  aheadCount: number
  behindCount: number
  branch: string
  publishRequired: boolean
  remoteName?: string
  upstreamBranch?: string
}

export interface GitRepositoryOptions {
  runner?: GitCommandRunner
}
