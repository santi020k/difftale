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

## License

MIT
