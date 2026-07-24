# Difftale for VS Code

Difftale creates validated Conventional Commit drafts from staged changes,
composes pull request titles and descriptions, and adds predictable older/newer
revision navigation to tracked files.

Open the Difftale icon in the Activity Bar for the Commit Composer, Pull Request
Composer, Quick Actions, Current File History, and Git Hooks & Operations.

The Commit Composer shows changed and staged counts. Stage all changes
explicitly, write or generate a Conventional Commit title and description, and
commit while Difftale streams hook output.

The Pull Request Composer has an editable title input and Markdown description
area. Write both manually or select **Generate with AI** to draft them from the
commits and diff between the current branch and the detected base branch. Drafts
persist in the workspace. **Create PR** uses an installed and authenticated
[GitHub CLI](https://cli.github.com/) and never pushes the branch automatically.

## Commands

- `Difftale: Generate Conventional Commit`
- `Difftale: Compose Pull Request`
- `Difftale: Compose Conventional Commit`
- `Difftale: Show File History`
- `Difftale: Open Older Revision`
- `Difftale: Open Newer Revision`
- `Difftale: Compare File with Working Tree`
- `Difftale: Commit with Hook Output`
- `Difftale: Push with Hook Output`
- `Difftale: Show Git and Hook Output`

Use `Alt+[` and `Alt+]` to move through file revisions.

Commit and push commands launch the real Git process and stream its output.
Difftale detects executable `pre-commit` and `pre-push` hooks, including custom
`core.hooksPath` configurations. Hooks are not executed separately, so they run
exactly once.

AI generation uses a language model already available through VS Code. Difftale
does not require or store a separate API key. Source changes are sent only when
you explicitly run a commit or pull request generation action.
