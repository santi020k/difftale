import { describe, expect, test } from 'vitest'

import { getCommitComposerHtml } from '../src/commit/get-commit-composer-html'

describe('getCommitComposerHtml', () => {
  test('renders native-style staging, drafting, and commit controls', () => {
    const html = getCommitComposerHtml('vscode-webview:', 'nonce', 2_000)

    expect(html).toContain('Staged Changes')
    expect(html).toContain('Stage all')
    expect(html).toContain('Unstage all')
    expect(html).toContain('id="title"')
    expect(html).toContain('id="description"')
    expect(html).toContain('Generate with AI')
    expect(html).toContain('id="commit"')
    expect(html).toContain('className = \'file-row\'')
    expect(html).toContain('role="list"')
    expect(html).toContain("directory || 'Repository root'")
    expect(html).toContain('type: actionType, paths: [filePath]')
    expect(html).toContain('id="commit-failure"')
    expect(html).toContain('Technical details')
    expect(html).toContain('Open full output')
    expect(html).toContain('Copy error')
    expect(html).toContain('[hidden] { display: none !important; }')
    expect(html).toContain('id="repository-state"')
    expect(html).toContain('ready to push')
    expect(html).toContain('id="push"')
    expect(html).toContain("vscode.postMessage({ type: 'push' })")
  })

  test('keeps push available when committed and working changes coexist', () => {
    const html = getCommitComposerHtml('vscode-webview:', 'nonce', 2_000)

    expect(html).toContain('repositoryState.hidden = hasWorkingChanges && !canPush')
    expect(html).toContain('if (hasWorkingChanges && canPush)')
    expect(html).toContain(
      'Push the committed changes now. Your current working changes will stay local.',
    )
    expect(html).not.toContain('repositoryState.hidden = hasWorkingChanges\n')
  })
})
