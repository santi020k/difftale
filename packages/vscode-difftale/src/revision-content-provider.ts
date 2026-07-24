import type { GitRepository, GitRevision } from '@santi020k/difftale-core'

import * as vscode from 'vscode'

import { REVISION_SCHEME } from './constants'

interface RevisionDocument {
  absoluteFilePath: string
  repositoryPath: string
  revision?: GitRevision
}

export class RevisionContentProvider implements vscode.TextDocumentContentProvider {
  readonly #documents = new Map<string, RevisionDocument>()
  readonly #repository: GitRepository
  #nextDocumentIdentifier = 0

  public constructor(repository: GitRepository) {
    this.#repository = repository
  }

  public createEmptyUri = (absoluteFilePath: string, repositoryPath: string): vscode.Uri =>
    this.#createUri({
      absoluteFilePath,
      repositoryPath,
    })

  public createRevisionUri = (
    absoluteFilePath: string,
    repositoryPath: string,
    revision: GitRevision,
  ): vscode.Uri =>
    this.#createUri({
      absoluteFilePath,
      repositoryPath,
      revision,
    })

  public getOriginalFilePath = (uri: vscode.Uri): string | undefined =>
    this.#documents.get(uri.query)?.absoluteFilePath

  public provideTextDocumentContent = async (uri: vscode.Uri): Promise<string> => {
    const document = this.#documents.get(uri.query)

    if (!document?.revision) {
      return ''
    }

    return this.#repository.getFileAtRevision(document.repositoryPath, document.revision)
  }

  #createUri(document: RevisionDocument): vscode.Uri {
    this.#nextDocumentIdentifier += 1

    const identifier = String(this.#nextDocumentIdentifier)

    this.#documents.set(identifier, document)

    const label = document.revision
      ? `${document.revision.filePath}@${document.revision.shortHash}`
      : 'empty'

    return vscode.Uri.from({
      path: `/${label}`,
      query: identifier,
      scheme: REVISION_SCHEME,
    })
  }
}
