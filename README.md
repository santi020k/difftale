# Difftale

AI-crafted commits and effortless file history for VS Code.

Difftale generates validated, multi-line Conventional Commit messages from
staged changes, composes pull requests manually or with AI, lets you move
through a file's Git revisions, and runs explicit commit and push operations
with visible Git hook output.

The Difftale icon in the VS Code Activity Bar opens:

- Commit Composer
- Pull Request Composer
- Quick Actions
- Current File History
- Git Hooks & Operations

## Workspace

```text
packages/difftale-core
packages/vscode-difftale
```

See [PROJECT.md](./PROJECT.md) for product behavior and architecture.

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Press `F5` from VS Code to launch an Extension Development Host, or package a
VSIX with:

```bash
pnpm package:extension
```

## Releases

Create a changeset with `pnpm changeset` for every user-facing change. Merges
to `main` update a release pull request; merging that pull request publishes
`@santi020k/difftale-core` to npm, creates a GitHub release, and publishes the
extension to VS Code Marketplace and Open VSX.

Copy `.env.example` to `.env` for local release commands. Configure its secret
values as GitHub Actions repository secrets before enabling automated releases:

- `NPM_TOKEN`
- `VSCE_PAT`
- `OVSX_PAT`
- `TURBO_TOKEN` and `TURBO_TEAM` (optional remote cache)

## License

MIT
