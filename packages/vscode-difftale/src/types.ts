import type { GitRevision } from '@santi020k/difftale-core'

export interface CommitGenerationSettings {
  allowedTypes: readonly string[]
  customInstructions: readonly string[]
  draftCount: number
  maximumDiffLengthCharacters: number
  maximumHeaderLengthCharacters: number
  modelFamily?: string
}

export interface CommitProjectContext {
  configurationFiles: string[]
  recentSubjects: string[]
  suggestedScopes: string[]
}

export interface PullRequestDraft {
  description: string
  title: string
}

export interface CommitDraft {
  description: string
  title: string
}

export interface PullRequestGenerationContext {
  baseBranch: string
  commitSubjects: string[]
  currentBranch: string
  diff: string
}

export interface PullRequestCreationRequest extends PullRequestDraft {
  baseBranch: string
  currentBranch: string
  repositoryPath: string
}

export interface PullRequestCreationResult {
  output: string
  succeeded: boolean
  url?: string
}

export interface RevisionTarget {
  filePath: string
  kind: 'empty' | 'git' | 'working'
  label: string
  revision?: GitRevision
}

export interface FileNavigationState {
  absoluteFilePath: string
  repositoryPath: string
  selectedIndex: number
  targets: RevisionTarget[]
}

export interface FileHistoryActionTarget {
  absoluteFilePath: string
  revisionHash: string
}

export interface GitHook {
  exists: boolean
  name: 'pre-commit' | 'pre-push'
  path: string
}

export interface GitOperationRequest {
  arguments: readonly string[]
  input?: string
  kind: 'commit' | 'push'
  repositoryPath: string
}

export interface GitOperationResult {
  cancelled: boolean
  durationMilliseconds: number
  exitCode: number | null
  output: string
  succeeded: boolean
}

export interface GitFailurePresentation {
  details: string
  summary: string
  title: string
}

export interface GitCommitResult {
  failure?: GitFailurePresentation
  succeeded: boolean
}

export interface GitOperationRecord {
  cancelled: boolean
  durationMilliseconds?: number
  failureSummary?: string
  hookNames: string[]
  id: string
  kind: 'commit' | 'push'
  output: string
  phase: 'cancelled' | 'failed' | 'running' | 'succeeded'
  repositoryPath: string
  startedAt: number
}
