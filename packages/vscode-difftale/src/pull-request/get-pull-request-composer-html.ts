export const getPullRequestComposerHtml = (
  contentSecurityPolicySource: string,
  nonce: string,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${contentSecurityPolicySource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';"
  >
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pull Request Composer</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
    }

    body {
      background: var(--vscode-sideBar-background);
      box-sizing: border-box;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      margin: 0;
      padding: 10px 12px 12px;
    }

    *, *::before, *::after {
      box-sizing: inherit;
    }

    .field {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
    }

    .label-row {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    label, .label-row span:first-child {
      font-weight: 600;
    }

    .field-meta {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      font-weight: 400;
    }

    input, textarea {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px;
      color: var(--vscode-input-foreground);
      font: inherit;
      outline: none;
      padding: 7px 9px;
      width: 100%;
    }

    input:focus, textarea:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    input::placeholder, textarea::placeholder {
      color: var(--vscode-input-placeholderForeground);
      opacity: 1;
    }

    input:focus-visible, textarea:focus-visible {
      border-color: var(--vscode-focusBorder);
    }

    textarea {
      line-height: 1.45;
      min-height: 145px;
      resize: vertical;
    }

    .context {
      align-items: center;
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      gap: 7px;
      margin-bottom: 12px;
      min-height: 30px;
      padding: 5px 8px;
    }

    .context[hidden] {
      display: none;
    }

    .context-icon {
      color: var(--vscode-gitDecoration-modifiedResourceForeground);
      font-size: 1.1em;
    }

    #branch-context {
      color: var(--vscode-foreground);
      font-family: var(--vscode-editor-font-family);
      font-size: 0.92em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: grid;
      gap: 6px;
      grid-template-columns: 1fr 1fr;
    }

    button {
      background: var(--vscode-button-secondaryBackground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 2px;
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      font: inherit;
      min-height: 32px;
      padding: 5px 9px;
    }

    button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    button.primary:disabled {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-disabledForeground);
    }

    .utility-actions {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }

    .utility-actions button {
      background: transparent;
      border: 0;
      color: var(--vscode-textLink-foreground);
      min-height: auto;
      padding: 3px 0;
    }

    .utility-actions button:hover {
      background: transparent;
      color: var(--vscode-textLink-activeForeground);
      text-decoration: underline;
    }

    #status {
      align-items: flex-start;
      background: var(--vscode-notifications-background);
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      gap: 7px;
      line-height: 1.4;
      margin: 10px 0 0;
      padding: 7px 8px;
    }

    #status[data-kind="success"] .status-icon {
      color: var(--vscode-testing-iconPassed);
    }

    #status[data-kind="warning"] .status-icon {
      color: var(--vscode-notificationsWarningIcon-foreground);
    }

    #status[data-kind="error"] .status-icon {
      color: var(--vscode-notificationsErrorIcon-foreground);
    }

    .status-icon {
      color: var(--vscode-notificationsInfoIcon-foreground);
      flex: 0 0 auto;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="context" id="context" hidden>
    <span class="context-icon" aria-hidden="true">⑂</span>
    <span id="branch-context"></span>
  </div>
  <div class="field">
    <div class="label-row">
      <label for="title">Title</label>
      <span class="field-meta" id="title-count">0</span>
    </div>
    <input
      id="title"
      placeholder="feat(checkout): preserve cart state"
      type="text"
    >
  </div>
  <div class="field">
    <label for="description">Description</label>
    <textarea
      id="description"
      placeholder="## Summary&#10;- Explain what changed and why&#10;&#10;## Testing&#10;- Describe verification"
    ></textarea>
  </div>
  <div class="actions">
    <button id="generate" type="button">Generate with AI</button>
    <button class="primary" id="create" type="button">Create PR</button>
  </div>
  <div class="utility-actions">
    <button id="copy" type="button">Copy draft</button>
    <button id="clear" type="button">Clear</button>
  </div>
  <p id="status" aria-live="polite" data-kind="info">
    <span class="status-icon" aria-hidden="true">i</span>
    <span id="status-text">Edit manually or generate from the current branch.</span>
  </p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi()
    const titleInput = document.getElementById('title')
    const descriptionInput = document.getElementById('description')
    const contextElement = document.getElementById('context')
    const branchContextElement = document.getElementById('branch-context')
    const titleCountElement = document.getElementById('title-count')
    const statusElement = document.getElementById('status')
    const statusIconElement = statusElement.querySelector('.status-icon')
    const statusTextElement = document.getElementById('status-text')
    const generateButton = document.getElementById('generate')
    const createButton = document.getElementById('create')
    const copyButton = document.getElementById('copy')
    const clearButton = document.getElementById('clear')
    const actionButtons = [...document.querySelectorAll('button')]
    let busy = false
    let canCreatePullRequest = false

    const getDraft = () => ({
      description: descriptionInput.value,
      title: titleInput.value,
    })

    const persistDraft = () => {
      const draft = getDraft()
      vscode.setState(draft)
      vscode.postMessage({ type: 'draftChanged', ...draft })
      updateControls()
    }

    const updateControls = () => {
      const draft = getDraft()
      const hasTitle = Boolean(draft.title.trim())
      const hasDescription = Boolean(draft.description.trim())

      generateButton.disabled = busy
      createButton.disabled =
        busy || !canCreatePullRequest || !hasTitle || !hasDescription
      copyButton.disabled = busy || (!hasTitle && !hasDescription)
      clearButton.disabled = busy || (!hasTitle && !hasDescription)
      titleCountElement.textContent = titleInput.maxLength > 0
        ? titleInput.value.length + '/' + titleInput.maxLength
        : String(titleInput.value.length)
    }

    const setBusy = value => {
      busy = value
      actionButtons.forEach(button => {
        button.setAttribute('aria-busy', String(busy))
      })
      updateControls()
    }

    const previousDraft = vscode.getState()

    if (previousDraft) {
      titleInput.value = previousDraft.title || ''
      descriptionInput.value = previousDraft.description || ''
    }

    updateControls()

    titleInput.addEventListener('input', persistDraft)
    descriptionInput.addEventListener('input', persistDraft)

    generateButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'generate' })
    })

    createButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'create', ...getDraft() })
    })

    copyButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'copy', ...getDraft() })
    })

    clearButton.addEventListener('click', () => {
      titleInput.value = ''
      descriptionInput.value = ''
      persistDraft()
      statusElement.dataset.kind = 'info'
      statusTextElement.textContent = 'Draft cleared.'
    })

    window.addEventListener('message', event => {
      const message = event.data

      if (message.type === 'setDraft') {
        titleInput.value = message.title
        descriptionInput.value = message.description
        vscode.setState(getDraft())
        updateControls()
      }

      if (message.type === 'context') {
        titleInput.maxLength = message.maximumHeaderLengthCharacters
        branchContextElement.textContent = message.currentBranch + ' → ' + message.baseBranch
        contextElement.hidden = false
        canCreatePullRequest = message.canCreatePullRequest
        updateControls()
      }

      if (message.type === 'status') {
        statusElement.dataset.kind = message.kind
        statusIconElement.textContent = {
          error: '×',
          info: 'i',
          success: '✓',
          warning: '!',
        }[message.kind]
        statusTextElement.textContent = message.text
      }

      if (message.type === 'busy') {
        setBusy(message.value)
      }
    })

    vscode.postMessage({ type: 'ready' })
  </script>
</body>
</html>`
