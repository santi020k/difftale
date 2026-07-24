import { describe, expect, test } from 'vitest'

import { getCommitComposerHtml } from '../src/commit/get-commit-composer-html'

describe('getCommitComposerHtml', () => {
  test('renders native-style staging, drafting, and commit controls', () => {
    const html = getCommitComposerHtml('vscode-webview:', 'nonce')

    expect(html).toContain('Staged Changes')
    expect(html).toContain('Stage all')
    expect(html).toContain('Stage a file with +, or select Stage all, before generating')
    expect(html).toContain('Unstage all')
    expect(html).toContain('id="title"')
    expect(html).toContain('id="description"')
    expect(html).toContain('Generate with AI')
    expect(html).toContain('id="commit"')
    expect(html).toContain('id="repository"')
    expect(html).toContain('id="draft-navigation"')
    expect(html).toContain('id="validation"')
    expect(html).toContain("type: 'selectRepository'")
    expect(html).not.toContain('setInterval(')
    expect(html).toContain('className = \'file-row\'')
    expect(html).toContain('role="list"')
    expect(html).toContain("directory || 'Repository root'")
    expect(html).toContain("type: 'openFile', path: filePath")
    expect(html).toContain("copy.title = 'Open ' + filePath")
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
    const html = getCommitComposerHtml('vscode-webview:', 'nonce')

    expect(html).toContain('repositoryState.hidden = hasWorkingChanges && !canPush')
    expect(html).toContain('if (hasWorkingChanges && canPush)')
    expect(html).toContain(
      'Push the committed changes now. Your current working changes will stay local.',
    )
    expect(html).not.toContain('repositoryState.hidden = hasWorkingChanges\n')
  })
})
