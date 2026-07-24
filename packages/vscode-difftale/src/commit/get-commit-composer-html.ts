export const getCommitComposerHtml = (
  contentSecurityPolicySource: string,
  nonce: string,
  refreshIntervalMilliseconds: number,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${contentSecurityPolicySource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    body {
      background: var(--vscode-sideBar-background);
      box-sizing: border-box;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      margin: 0;
      padding: 10px 12px 12px;
    }
    *, *::before, *::after { box-sizing: inherit; }
    [hidden] { display: none !important; }
    .field { display: grid; gap: 6px; margin-bottom: 12px; }
    .scm {
      border-top: 1px solid var(--vscode-widget-border, transparent);
      margin-top: 12px;
      padding-top: 6px;
    }
    .scm-section { margin-top: 8px; }
    .scm-header {
      align-items: center;
      display: flex;
      gap: 6px;
      min-height: 30px;
      padding: 0 2px;
    }
    .scm-title { font-weight: 600; }
    .count-badge {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      font-variant-numeric: tabular-nums;
    }
    .scm-header .link-button { margin-left: auto; }
    .file-list {
      border-bottom: 1px solid var(--vscode-widget-border, transparent);
      border-top: 1px solid var(--vscode-widget-border, transparent);
      max-height: min(220px, 35vh);
      overflow: auto;
    }
    .file-row {
      align-items: center;
      display: grid;
      border-top: 1px solid transparent;
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
      min-height: 42px;
      padding: 5px 2px 5px 8px;
    }
    .file-row + .file-row {
      border-top-color: var(--vscode-widget-border, transparent);
    }
    .file-row:hover { background: var(--vscode-list-hoverBackground); }
    .file-copy {
      display: grid;
      gap: 1px;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    }
    .file-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-directory {
      color: var(--vscode-descriptionForeground);
      font-size: 0.85em;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .icon-button {
      background: transparent;
      border: 0;
      color: var(--vscode-icon-foreground);
      font-size: 17px;
      line-height: 22px;
      min-height: 26px;
      opacity: 0.55;
      padding: 1px 7px;
    }
    .file-row:hover .icon-button, .icon-button:focus-visible { opacity: 1; }
    .icon-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }
    #empty-changes {
      color: var(--vscode-descriptionForeground);
      margin: 10px 0 2px;
      text-align: center;
    }
    .label-row { align-items: center; display: flex; justify-content: space-between; }
    label { font-weight: 600; }
    .field-meta { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
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
    textarea { line-height: 1.45; min-height: 100px; resize: vertical; }
    .actions { display: grid; gap: 6px; grid-template-columns: 1fr 1fr; }
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
    button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.primary:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-disabledForeground);
      cursor: not-allowed;
      opacity: 0.5;
    }
    .link-button {
      background: transparent;
      border: 0;
      color: var(--vscode-textLink-foreground);
      min-height: auto;
      padding: 3px 0;
    }
    .link-button:hover {
      background: transparent;
      color: var(--vscode-textLink-activeForeground);
      text-decoration: underline;
    }
    .utility { display: flex; justify-content: flex-end; margin-top: 7px; }
    #status {
      background: var(--vscode-notifications-background);
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      gap: 7px;
      line-height: 1.4;
      margin: 9px 0 0;
      padding: 7px 8px;
    }
    #status[data-kind="success"] .status-icon { color: var(--vscode-testing-iconPassed); }
    #status[data-kind="warning"] .status-icon { color: var(--vscode-notificationsWarningIcon-foreground); }
    #status[data-kind="error"] .status-icon { color: var(--vscode-notificationsErrorIcon-foreground); }
    .status-icon { color: var(--vscode-notificationsInfoIcon-foreground); font-weight: 700; }
    .failure-card {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      border-radius: 3px;
      margin-top: 9px;
      padding: 10px;
    }
    .failure-heading {
      align-items: flex-start;
      display: flex;
      gap: 8px;
    }
    .failure-icon {
      color: var(--vscode-notificationsErrorIcon-foreground);
      font-size: 1.25em;
      font-weight: 700;
      line-height: 1;
    }
    .failure-title { font-weight: 600; }
    .failure-summary {
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
      margin: 5px 0 0;
      overflow-wrap: anywhere;
    }
    .failure-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
    details {
      border-top: 1px solid var(--vscode-inputValidation-errorBorder);
      margin-top: 8px;
      padding-top: 7px;
    }
    summary { color: var(--vscode-textLink-foreground); cursor: pointer; }
    pre {
      background: var(--vscode-textCodeBlock-background);
      font-family: var(--vscode-editor-font-family);
      font-size: 0.88em;
      line-height: 1.4;
      margin: 7px 0 0;
      max-height: 180px;
      overflow: auto;
      padding: 8px;
      white-space: pre-wrap;
    }
    .repository-state {
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 4px;
      margin-top: 2px;
      padding: 22px 14px 16px;
      text-align: center;
    }
    .repository-state-icon {
      color: var(--vscode-testing-iconPassed);
      font-size: 28px;
      line-height: 1;
    }
    .repository-state[data-state="outgoing"] .repository-state-icon {
      color: var(--vscode-gitDecoration-addedResourceForeground);
    }
    .repository-state-title {
      font-size: 1.08em;
      font-weight: 600;
      margin-top: 9px;
    }
    .repository-state-description {
      color: var(--vscode-descriptionForeground);
      line-height: 1.45;
      margin: 6px auto 0;
      max-width: 32em;
    }
    .branch-route {
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      display: inline-block;
      font-family: var(--vscode-editor-font-family);
      margin-top: 10px;
      padding: 5px 8px;
    }
    #push { margin-top: 14px; width: 100%; }
  </style>
</head>
<body>
  <div id="commit-form">
  <div class="field">
    <div class="label-row">
      <label for="title">Title</label>
      <span class="field-meta" id="title-count">0</span>
    </div>
    <input id="title" placeholder="feat(checkout): preserve cart state" type="text">
  </div>
  <div class="field">
    <label for="description">Description</label>
    <textarea id="description" placeholder="Explain what changed and why"></textarea>
  </div>
  <div class="actions">
    <button id="generate" type="button">Generate with AI</button>
    <button class="primary" id="commit" type="button">Commit</button>
  </div>
  <div class="utility"><button class="link-button" id="clear" type="button">Clear</button></div>
  <p id="status" aria-live="polite" data-kind="info">
    <span class="status-icon" aria-hidden="true">i</span>
    <span id="status-text">Reading repository changes…</span>
  </p>
  <section class="failure-card" id="commit-failure" role="alert" hidden>
    <div class="failure-heading">
      <span class="failure-icon" aria-hidden="true">×</span>
      <div>
        <div class="failure-title" id="failure-title">Commit blocked</div>
        <p class="failure-summary" id="failure-summary"></p>
      </div>
    </div>
    <div class="failure-actions">
      <button class="link-button" data-failure-action id="copy-failure" type="button">Copy error</button>
      <button class="link-button" data-failure-action id="show-git-output" type="button">Open full output</button>
    </div>
    <details>
      <summary>Technical details</summary>
      <pre id="failure-details"></pre>
    </details>
  </section>
  <div class="scm">
    <section class="scm-section" id="unstaged-section" hidden>
      <div class="scm-header">
        <span class="scm-title">Changes</span>
        <span class="count-badge" id="unstaged-count">0</span>
        <button class="link-button" data-git-action id="stage-all" type="button">Stage all</button>
      </div>
      <div aria-label="Unstaged files" class="file-list" id="unstaged-files" role="list"></div>
    </section>
    <section class="scm-section" id="staged-section" hidden>
      <div class="scm-header">
        <span class="scm-title">Staged Changes</span>
        <span class="count-badge" id="staged-count">0</span>
        <button class="link-button" data-git-action id="unstage-all" type="button">Unstage all</button>
      </div>
      <div aria-label="Staged files" class="file-list" id="staged-files" role="list"></div>
    </section>
    <p id="empty-changes" hidden>No working changes</p>
  </div>
  </div>
  <section class="repository-state" data-state="clean" id="repository-state" hidden>
    <div class="repository-state-icon" id="repository-state-icon" aria-hidden="true">✓</div>
    <div class="repository-state-title" id="repository-state-title">Everything is up to date</div>
    <p class="repository-state-description" id="repository-state-description"></p>
    <div class="branch-route" id="branch-route"></div>
    <button class="primary" id="push" type="button" hidden>Push</button>
  </section>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi()
    const commitForm = document.getElementById('commit-form')
    const titleInput = document.getElementById('title')
    const descriptionInput = document.getElementById('description')
    const titleCount = document.getElementById('title-count')
    const generateButton = document.getElementById('generate')
    const commitButton = document.getElementById('commit')
    const clearButton = document.getElementById('clear')
    const stageAllButton = document.getElementById('stage-all')
    const unstageAllButton = document.getElementById('unstage-all')
    const unstagedSection = document.getElementById('unstaged-section')
    const stagedSection = document.getElementById('staged-section')
    const unstagedCountElement = document.getElementById('unstaged-count')
    const stagedCountElement = document.getElementById('staged-count')
    const unstagedFilesElement = document.getElementById('unstaged-files')
    const stagedFilesElement = document.getElementById('staged-files')
    const emptyChangesElement = document.getElementById('empty-changes')
    const commitFailure = document.getElementById('commit-failure')
    const failureTitle = document.getElementById('failure-title')
    const failureSummary = document.getElementById('failure-summary')
    const failureDetails = document.getElementById('failure-details')
    const copyFailureButton = document.getElementById('copy-failure')
    const showGitOutputButton = document.getElementById('show-git-output')
    const repositoryState = document.getElementById('repository-state')
    const repositoryStateIcon = document.getElementById('repository-state-icon')
    const repositoryStateTitle = document.getElementById('repository-state-title')
    const repositoryStateDescription = document.getElementById('repository-state-description')
    const branchRoute = document.getElementById('branch-route')
    const pushButton = document.getElementById('push')
    const status = document.getElementById('status')
    const statusIcon = status.querySelector('.status-icon')
    const statusText = document.getElementById('status-text')
    let stagedCount = 0
    let stagedFilePaths = []
    let unstagedFilePaths = []
    let aheadCount = 0
    let canPush = false
    let busy = false

    const draft = () => ({
      description: descriptionInput.value,
      title: titleInput.value,
    })

    const updateControls = () => {
      const value = draft()
      const hasDraft = Boolean(value.title.trim() || value.description.trim())
      generateButton.disabled = busy || stagedCount === 0
      commitButton.disabled = busy || stagedCount === 0 || !value.title.trim()
      clearButton.disabled = busy || !hasDraft
      pushButton.disabled = busy || !canPush
      document.querySelectorAll('[data-git-action]').forEach(button => {
        button.disabled = busy
      })
      document.querySelectorAll('[data-failure-action]').forEach(button => {
        button.disabled = busy
      })
      titleCount.textContent = titleInput.maxLength > 0
        ? titleInput.value.length + '/' + titleInput.maxLength
        : String(titleInput.value.length)
    }

    const persist = () => {
      vscode.setState(draft())
      vscode.postMessage({ type: 'draftChanged', ...draft() })
      updateControls()
    }

    const previousDraft = vscode.getState()
    if (previousDraft) {
      titleInput.value = previousDraft.title || ''
      descriptionInput.value = previousDraft.description || ''
    }

    titleInput.addEventListener('input', persist)
    descriptionInput.addEventListener('input', persist)
    stageAllButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'stageFiles', paths: unstagedFilePaths })
    })
    unstageAllButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'unstageFiles', paths: stagedFilePaths })
    })
    copyFailureButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'copyGitFailure' })
    })
    showGitOutputButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'showGitOutput' })
    })
    pushButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'push' })
    })
    generateButton.addEventListener('click', () => vscode.postMessage({ type: 'generate' }))
    commitButton.addEventListener('click', () => vscode.postMessage({ type: 'commit', ...draft() }))
    clearButton.addEventListener('click', () => {
      titleInput.value = ''
      descriptionInput.value = ''
      persist()
    })

    const renderFileList = (container, filePaths, actionType, actionLabel, symbol) => {
      container.replaceChildren()
      filePaths.forEach(filePath => {
        const separatorIndex = filePath.lastIndexOf('/')
        const fileName = separatorIndex >= 0
          ? filePath.slice(separatorIndex + 1)
          : filePath
        const directory = separatorIndex >= 0 ? filePath.slice(0, separatorIndex) : ''
        const row = document.createElement('div')
        row.className = 'file-row'
        row.setAttribute('role', 'listitem')
        const copy = document.createElement('div')
        copy.className = 'file-copy'
        copy.title = filePath
        const name = document.createElement('span')
        name.className = 'file-name'
        name.textContent = fileName
        const directoryElement = document.createElement('span')
        directoryElement.className = 'file-directory'
        directoryElement.textContent = directory || 'Repository root'
        copy.append(name, directoryElement)
        const action = document.createElement('button')
        action.className = 'icon-button'
        action.dataset.gitAction = ''
        action.type = 'button'
        action.title = actionLabel + ' ' + filePath
        action.setAttribute('aria-label', action.title)
        action.textContent = symbol
        action.addEventListener('click', () => {
          vscode.postMessage({ type: actionType, paths: [filePath] })
        })
        row.append(copy, action)
        container.append(row)
      })
    }

    const renderRepositoryState = (message, hasWorkingChanges) => {
      commitForm.hidden = !hasWorkingChanges

      const commitLabel = aheadCount === 1 ? 'commit' : 'commits'
      const behindLabel = message.behindCount === 1 ? 'commit' : 'commits'
      canPush = message.publishRequired ||
        (aheadCount > 0 && message.behindCount === 0)
      repositoryState.hidden = hasWorkingChanges && !canPush
      branchRoute.textContent = message.upstreamBranch
        ? message.branch + ' → ' + message.upstreamBranch
        : message.remoteName
          ? message.branch + ' → ' + message.remoteName + '/' + message.branch
          : message.branch
      pushButton.textContent = 'Push ' + aheadCount + ' ' + commitLabel
      pushButton.hidden = !canPush

      if (hasWorkingChanges && canPush) {
        repositoryState.dataset.state = 'outgoing'
        repositoryStateIcon.textContent = '↑'
        repositoryStateTitle.textContent = message.publishRequired
          ? 'Committed branch ready to publish'
          : aheadCount + ' ' + commitLabel + ' ready to push'
        repositoryStateDescription.textContent = message.publishRequired
          ? 'Publish the committed branch without including your current working changes.'
          : 'Push the committed changes now. Your current working changes will stay local.'
        pushButton.textContent = message.publishRequired
          ? 'Publish branch'
          : 'Push ' + aheadCount + ' ' + commitLabel

        return
      }

      if (message.publishRequired) {
        repositoryState.dataset.state = 'outgoing'
        repositoryStateIcon.textContent = '↑'
        repositoryStateTitle.textContent = 'Branch ready to publish'
        repositoryStateDescription.textContent =
          'Your working tree is clean. Publish this branch and configure its upstream.'
        pushButton.textContent = 'Publish branch'

        return
      }

      if (message.behindCount > 0 && aheadCount > 0) {
        repositoryState.dataset.state = 'clean'
        repositoryStateIcon.textContent = '↕'
        repositoryStateTitle.textContent = 'Branch has diverged'
        repositoryStateDescription.textContent =
          aheadCount + ' ' + commitLabel + ' ahead and ' +
          message.behindCount + ' ' + behindLabel + ' behind. Sync before pushing.'

        return
      }

      if (message.behindCount > 0) {
        repositoryState.dataset.state = 'clean'
        repositoryStateIcon.textContent = '↓'
        repositoryStateTitle.textContent =
          message.behindCount + ' ' + behindLabel + ' behind'
        repositoryStateDescription.textContent =
          'Your working tree is clean, but the upstream branch has newer commits.'

        return
      }

      if (canPush) {
        repositoryState.dataset.state = 'outgoing'
        repositoryStateIcon.textContent = '↑'
        repositoryStateTitle.textContent =
          aheadCount + ' ' + commitLabel + ' ready to push'
        repositoryStateDescription.textContent =
          'Your working tree is clean. Push the outgoing ' + commitLabel + ' when you are ready.'

        return
      }

      repositoryState.dataset.state = 'clean'
      repositoryStateIcon.textContent = '✓'
      repositoryStateTitle.textContent = 'Everything is up to date'
      repositoryStateDescription.textContent = message.upstreamBranch
        ? 'Your working tree is clean and the branch matches its upstream.'
        : 'Your working tree is clean. This branch does not have an upstream yet.'
    }

    window.addEventListener('message', event => {
      const message = event.data
      if (message.type === 'draft') {
        titleInput.value = message.title
        descriptionInput.value = message.description
        vscode.setState(draft())
      }
      if (message.type === 'context') {
        stagedFilePaths = message.stagedFilePaths
        unstagedFilePaths = message.unstagedFilePaths
        stagedCount = stagedFilePaths.length
        aheadCount = message.aheadCount
        const hasWorkingChanges = unstagedFilePaths.length > 0 || stagedCount > 0
        titleInput.maxLength = message.maximumHeaderLengthCharacters
        renderRepositoryState(message, hasWorkingChanges)
        unstagedCountElement.textContent = String(unstagedFilePaths.length)
        stagedCountElement.textContent = String(stagedCount)
        unstagedSection.hidden = unstagedFilePaths.length === 0
        stagedSection.hidden = stagedCount === 0
        emptyChangesElement.hidden = unstagedFilePaths.length > 0 || stagedCount > 0
        renderFileList(
          unstagedFilesElement,
          unstagedFilePaths,
          'stageFiles',
          'Stage',
          '+',
        )
        renderFileList(
          stagedFilesElement,
          stagedFilePaths,
          'unstageFiles',
          'Unstage',
          '−',
        )
      }
      if (message.type === 'busy') busy = message.value
      if (message.type === 'clearCommitFailure') {
        commitFailure.hidden = true
        status.hidden = false
      }
      if (message.type === 'commitFailure') {
        failureTitle.textContent = message.title
        failureSummary.textContent = message.summary
        failureDetails.textContent = message.details
        commitFailure.hidden = false
        status.hidden = true
      }
      if (message.type === 'status') {
        status.dataset.kind = message.kind
        statusIcon.textContent = { error: '×', info: 'i', success: '✓', warning: '!' }[message.kind]
        statusText.textContent = message.text
      }
      updateControls()
    })

    updateControls()
    vscode.postMessage({ type: 'ready' })
    setInterval(() => {
      if (document.visibilityState === 'visible' && !busy) {
        vscode.postMessage({ type: 'refresh' })
      }
    }, ${refreshIntervalMilliseconds})
  </script>
</body>
</html>`
