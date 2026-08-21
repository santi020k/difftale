# Changelog

## 0.9.1

### Patch Changes

- [#13](https://github.com/santi020k/difftale/pull/13) [`3479eee`](https://github.com/santi020k/difftale/commit/3479eee07a0acc81e2df4498983ad92d3f99ed3b) Thanks [@santi020k](https://github.com/santi020k)! - Normalize the optional trailing DNS dot in Bitbucket remotes before creating commit links.

- [#7](https://github.com/santi020k/difftale/pull/7) [`593183e`](https://github.com/santi020k/difftale/commit/593183ef4f3bf7f41e5e7fd66a1ba44b985e032e) Thanks [@santi020k](https://github.com/santi020k)! - Match Bitbucket commit links by exact hostname so lookalike hosts cannot select a provider-specific route.

- Updated dependencies []:
  - @santi020k/difftale-core@0.9.1

## 0.9.0

### Minor Changes

- [`c2f33c8`](https://github.com/santi020k/difftale/commit/c2f33c8785f033f116bd651ff0587f985fe6303e) Thanks [@santi020k](https://github.com/santi020k)! - Make commit and pull request composition repository-aware, preserve drafts per
  branch, offer multiple generated commit drafts, improve large-diff coverage,
  validate commit messages live, allow selecting pull request base branches,
  refresh from Git events, and add focused revision actions.

- [`1a8f047`](https://github.com/santi020k/difftale/commit/1a8f047b3fb9ad0412d7c6a526afc9831ab5d3db) Thanks [@santi020k](https://github.com/santi020k)! - Prompt securely for SSH passphrases and other Git credentials during push operations.

### Patch Changes

- Updated dependencies [[`c2f33c8`](https://github.com/santi020k/difftale/commit/c2f33c8785f033f116bd651ff0587f985fe6303e)]:
  - @santi020k/difftale-core@0.9.0

## Unreleased

- Scope commit and pull request drafts to the selected repository and branch.
- Add explicit repository selection to both composers and selectable pull
  request base branches.
- Show multiple generated commit alternatives in the Commit Composer.
- Fall back to a local commit draft when AI generation is unavailable or
  invalid.
- Validate Conventional Commit drafts while they are edited.
- Preserve changed-file coverage when fitting large diffs to a model.
- Refresh composer state from Git events instead of polling.
- Add copy-hash and open-on-remote actions to committed file revisions.

## 0.8.0

- Replace the disabled empty composer with clean, outgoing, behind, and
  diverged branch states.
- Show outgoing commit counts and the local-to-upstream branch route.
- Add a primary Push action when the working tree is clean and commits are
  ready.
- Offer Publish branch and configure its upstream when a committed branch has
  not been pushed before.
- Make Quick Actions show Push only when the branch has pushable commits.

## 0.7.0

- Surface the most useful hook or Git error directly in the Commit Composer.
- Add expandable technical details, Copy error, and Open full output actions.
- Show the extracted failure summary in Git Hooks & Operations.
- Include the actionable error in failed-operation notifications.

## 0.6.0

- Move repository changes below the commit form.
- Separate Changes and Staged Changes using the native VS Code source-control
  model.
- Add per-file and bulk Stage and Unstage actions.

## 0.5.1

- Refresh Commit Composer status while the sidebar is visible.
- Resolve the workspace repository when a Git diff editor is active.
- List unstaged files with checkboxes and stage only the selected changes.

## 0.5.0

- Add a dedicated Commit Composer sidebar section.
- Show changed and staged file counts with explicit Stage all behavior.
- Add editable Conventional Commit title and description fields.
- Generate a model-sized commit draft from staged changes.
- Commit through Difftale with existing hook progress and output.
- Remove redundant commit actions from Quick Actions.

## 0.4.0

- Redesign the Pull Request Composer with native sidebar colors and compact
  spacing.
- Add branch context, concise status callouts, and live title length feedback.
- Disable actions until their required fields and branch state are ready.
- Move copy and clear into lightweight utility actions.
- Remove the duplicate composer Quick Action and collapse secondary views by
  default on fresh installs.

## 0.3.1

- Fit pull request prompts to the selected VS Code language model using its
  token counter.
- Truncate only the diff when a large branch would exceed the model input
  limit.
- Show when a draft was generated from a model-sized portion of the diff.

## 0.3.0

- Add a Pull Request Composer with editable title and description fields.
- Generate Conventional Commit-style PR titles and Markdown descriptions with
  the VS Code language model.
- Persist, copy, clear, and manually edit pull request drafts.
- Detect the current and default base branches and summarize their commits and
  diff.
- Create pull requests explicitly through the authenticated GitHub CLI.

## 0.2.0

- Add a visible Difftale Activity Bar container.
- Add Quick Actions, Current File History, and Git Hooks & Operations views.
- Add explicit Difftale commit and push commands with cancellable progress.
- Detect native and custom-path pre-commit and pre-push hooks.
- Stream complete Git and hook output while showing persistent operation
  results.
- Open revisions directly from the file-history sidebar.

## 0.1.0

- Generate multiple validated Conventional Commit drafts with VS Code language
  models.
- Compose Conventional Commits manually without AI.
- Navigate older and newer file revisions from the editor toolbar.
- Follow file renames and compare revisions in a reusable VS Code diff editor.
- Browse searchable file history with working-tree awareness.
