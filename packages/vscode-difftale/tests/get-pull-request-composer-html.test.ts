import { describe, expect, test } from 'vitest'

import { getPullRequestComposerHtml } from '../src/pull-request/get-pull-request-composer-html'

describe('getPullRequestComposerHtml', () => {
  test('renders editable PR fields and explicit actions', () => {
    const html = getPullRequestComposerHtml('vscode-webview:', 'secure-nonce')

    expect(html).toContain('id="title"')
    expect(html).toContain('id="description"')
    expect(html).toContain('Generate with AI')
    expect(html).toContain('Create PR')
    expect(html).toContain('Copy draft')
    expect(html).toContain("script-src 'nonce-secure-nonce'")
    expect(html).toContain('var(--vscode-sideBar-background)')
    expect(html).toContain('id="branch-context"')
    expect(html).toContain('id="title-count"')
    expect(html).toContain('data-kind="info"')
  })
})
