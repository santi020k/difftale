<div align="center">
  <img src="./packages/vscode-difftale/resources/icon.svg" alt="Difftale logo" width="96" />
  <h1>Difftale</h1>
  <p><strong>AI-crafted commits, pull request drafts, and effortless file history for VS Code.</strong></p>
</div>

Difftale adds a focused layer to VS Code's Git experience. It helps you write
clear Conventional Commits, prepare pull requests, move through the history of
the file you are editing, and run commits and pushes with visible hook output.

It does not replace VS Code Source Control or a full Git client. It makes a few
repetitive workflows faster while keeping every meaningful Git action explicit.

## Highlights

- **Generate Conventional Commits** — create up to five editable commit-message
  drafts from staged changes using a language model available through VS Code.
- **Compose commits manually** — write and validate Conventional Commits without
  enabling AI.
- **Draft pull requests** — generate or write an editable title and Markdown
  description from the current branch.
- **Navigate file history** — move to older or newer revisions, including across
  Git renames, without filling the editor with tabs.
- **Run Git with confidence** — commit and push explicitly while Difftale streams
  Git and hook output into a dedicated channel.
- **Stay in context** — use the Activity Bar, Source Control view, editor title,
  context menus, keyboard shortcuts, or Command Palette.

## How it works

### Create a commit

1. Stage the changes you want to commit.
2. Open the Difftale view from the Activity Bar.
3. Write a message or select **Generate with AI**.
4. Review and edit the title and description.
5. Commit explicitly from Difftale.

Generated messages follow the Conventional Commits structure:

```text
<type>(<optional-scope>): <summary>

<optional body explaining what changed and why>

<optional footer>
```

Difftale validates the type, header length, body spacing, and breaking-change
syntax before using a message. It never stages changes automatically.

### Prepare a pull request

Open the **Pull Request Composer** to write or generate a title and Markdown
description from the commits and diff between the current branch and its
detected base branch.

Drafts are saved in VS Code workspace state. You can copy a draft or create the
pull request explicitly with an installed and authenticated
[GitHub CLI](https://cli.github.com/). Difftale does not push the branch for you.

### Browse a file's revisions

With a tracked file open, use:

- `Alt+[` to open the next older revision.
- `Alt+]` to move toward the working file.
- **Difftale: Show File History** to select a revision directly.
- **Difftale: Compare File with Working Tree** to open a diff.

Difftale follows files across renames and reuses preview diff editors to avoid
tab clutter.

### See Git and hook output

**Commit with Difftale** and **Push with Difftale** run the real Git commands.
Difftale detects executable `pre-commit` and `pre-push` hooks—including custom
`core.hooksPath` setups such as Husky—and streams their output.

Hooks are not run separately, so Git executes each hook exactly once. Complete
output remains available in the **Difftale Git** output channel.

## Requirements

- VS Code `1.125.0` or newer
- Git and a Git repository opened in VS Code
- A language model exposed through the VS Code Language Model API for AI
  generation
- GitHub CLI only when using **Create PR**

AI features do not require Difftale to store a separate API key. Manual commit
and pull request composition, file history, and Git operations remain available
without a model.

## Install from source

This repository currently packages the extension as a VSIX:

```bash
git clone https://github.com/santi020k/difftale.git
cd difftale
pnpm install
pnpm package:extension
```

Then run **Extensions: Install from VSIX...** in VS Code and select:

```text
packages/vscode-difftale/difftale.vsix
```

## Configuration

Open VS Code settings and search for `Difftale`.

| Setting | Default | Purpose |
| --- | ---: | --- |
| `difftale.allowedTypes` | Conventional Commit defaults | Types accepted in commit headers |
| `difftale.maximumHeaderLength` | `72` | Maximum commit header length |
| `difftale.maximumDiffLength` | `60000` | Maximum staged diff length sent to the model |
| `difftale.modelFamily` | First available model | Preferred VS Code model family |
| `difftale.customInstructions` | `[]` | Project-specific generation guidance |
| `difftale.draftCount` | `3` | Number of generated alternatives (`1`–`5`) |

## Privacy and safety

- Source changes are sent to a language model only after you invoke generation
  and approve VS Code's model-access consent.
- AI output is parsed and validated before Difftale uses it.
- Generated commit and pull request drafts remain editable.
- Difftale never stages, restores, rewrites, commits, pushes, or creates a pull
  request without an explicit action.
- Pull request creation uses your local, authenticated GitHub CLI session.

## Development

Difftale is a pnpm and Turbo monorepo:

```text
packages/
├── difftale-core/      # Git history, commit formatting, parsing, and validation
└── vscode-difftale/    # VS Code integration, UI, AI, Git, and navigation
```

`difftale-core` is deterministic and independent of VS Code. The extension
package owns user interaction and bundles the core.

### Prerequisites

- Node.js `22.22.3`, `24.16.0`, or `26.3.0` and newer
- pnpm `10.34.3`

### Setup

```bash
pnpm install
pnpm build
```

Press `F5` in VS Code to launch an Extension Development Host. For watch mode:

```bash
pnpm dev
```

### Verification

Run the full project checks before submitting changes:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

See [PROJECT.md](./PROJECT.md) for the product contract, architecture, and
non-goals. Package-specific details live in
[`packages/vscode-difftale`](./packages/vscode-difftale) and
[`packages/difftale-core`](./packages/difftale-core).

## Contributing

Issues and focused pull requests are welcome. Keep the core package independent
of VS Code, treat model responses as untrusted input, and preserve Difftale's
explicit-action approach to Git operations.

## License

[MIT](./LICENSE) © Santiago Molina
