# Difftale Project Context

## Product thesis

Difftale helps developers create understandable Git history and navigate that
history without leaving the file they are working in.

The extension combines three workflows that should reinforce each other:

1. Create structured, descriptive Conventional Commit messages from staged
   changes with a VS Code language model.
2. Move backward and forward through the revisions of one file with predictable
   controls and a reusable diff editor.
3. Run explicit commit and push operations with visible progress, detected Git
   hooks, streamed output, and durable results.
4. Write or generate a pull request title and Markdown description from the
   current branch, then copy the draft or create the PR explicitly.

Difftale is not intended to replace the complete Git interface, GitLens, or the
built-in VS Code Source Control view. It adds a focused layer to the workflows
where those tools are unnecessarily broad or repetitive.

## Product principles

- One action should have one obvious result.
- Generated commit messages must be editable and validated before use.
- Difftale never stages, commits, pushes, restores, or rewrites files
  automatically. Commit and push happen only through explicit user actions.
- Older always moves backward in file history; newer always moves toward the
  working file.
- Revision navigation reuses preview editors to avoid tab clutter.
- The extension works without an external API key when a VS Code language model
  is available.
- Manual Conventional Commit composition remains available without AI.
- Source code is sent to a language model only after a user invokes generation
  and approves VS Code's model-access consent.
- Commit and pull request drafts remain editable and are saved per repository
  and branch in workspace state.
- Creating a pull request requires an explicit action and uses the authenticated
  GitHub CLI without pushing a branch automatically.
- Hooks run exactly once as part of Git's normal commit or push lifecycle.
- Complete Git and hook output remains available in the Difftale Git output
  channel.

## Commit message contract

Generated messages use:

```text
<type>(<optional-scope>): <summary>

<optional body explaining what changed and why>

<optional footer>
```

The default types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, and `revert`. The extension validates the
header, summary, configured maximum length, body spacing, and breaking-change
syntax before placing a selected draft in Source Control.

The AI should describe intent and behavior, not produce a file-by-file inventory.
Scopes should be short and inferred from the affected package or feature.

## Revision model

The history is ordered newest first. A working-tree revision is added when the
open file differs from `HEAD`. Each historical entry stores the path used at
that commit so navigation continues across Git renames.

The diff for a selected entry compares:

- the selected revision on the right; and
- its immediately older revision on the left.

The oldest entry compares against an empty document, representing file
creation.

## Git operations and hooks

`Commit with Difftale` uses the current Git Source Control message and runs
`git commit --file=-`. The message is validated before Git starts. Difftale
does not stage changes automatically.

`Push with Difftale` runs `git push` for the current branch and its configured
upstream.

Before each operation, Difftale resolves Git's active hooks directory,
including `core.hooksPath` configurations used by tools such as Husky. It
detects the relevant executable hook:

- `pre-commit` for commits
- `pre-push` for pushes

Difftale does not execute a hook independently. It launches the real Git
command and streams its stdout and stderr, so the hook runs once and its actual
result controls the Git operation. A failed operation is described as being
blocked during the detected hook or Git because Git does not expose a stable
machine-readable boundary between hook failures and later Git failures.

## Architecture

The repository mirrors Astro Doctor's pnpm and Turbo monorepo structure.

```text
packages/
  difftale-core/
    src/
      git/
      utils/
      constants.ts
      index.ts
      types.ts
    tests/
  vscode-difftale/
    src/
      ai/
      git/
      pull-request/
      sidebar/
      utils/
      commit-message-controller.ts
      extension.ts
      file-history-controller.ts
      revision-content-provider.ts
    tests/
```

`difftale-core` contains deterministic behavior and has no dependency on VS
Code. `vscode-difftale` owns user interaction and bundles the core into the
extension.

## VS Code surfaces

- Activity Bar: a visible Difftale container.
- Commit Composer: changed/staged counts, explicit staging, editable title and
  description, AI generation, and hook-aware commit execution.
- Pull Request Composer: editable title and description, AI generation, draft
  persistence, repository and base-branch selection, copy, clear, and explicit
  GitHub PR creation.
- Quick Actions: generate, compose, commit, push, browse history, and open
  output.
- Current File History: direct revision entries for the active file.
- Git Hooks & Operations: live and recent commit/push results.
- Source Control title: generate a commit message and manually compose one.
- Editor title: older revision, newer revision, and file history.
- Command Palette: all commands.
- Status bar: current revision position while navigating.
- VS Code diff editor: historical comparisons.

## Non-goals for the initial release

- Branch graph replacement
- Pull request review and merge management
- Git blame decorations
- Automatic staging, committing, or pushing
- Rebasing, resetting, restoring, or force pushing
- Cloud accounts or a Difftale-hosted model service

## Verification

Every release must pass:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Core tests cover formatting, parsing, validation, rename-aware Git log parsing,
and repository execution. Extension tests cover AI response parsing, fallback
generation, and revision URI behavior.
