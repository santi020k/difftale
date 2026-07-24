# Difftale Development Instructions

## Project

Difftale is a focused VS Code source-control extension for AI-crafted
Conventional Commits and low-friction file revision navigation.

Read `PROJECT.md` before changing product behavior or architecture.

## Commands

Use pnpm exclusively.

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## Code conventions

- Use TypeScript interfaces over type aliases.
- Use arrow functions over function declarations.
- Use kebab-case file names.
- Use descriptive names.
- Put shared magic numbers in `constants.ts` with unit suffixes.
- Put small utilities in `utils/`, one utility per file.
- Avoid type casts unless the external VS Code API makes one unavoidable.
- Use `Boolean()` instead of double negation.
- Do not add comments unless they explain a necessary hack.
- Keep the core package independent of VS Code.
- Keep AI responses untrusted until parsed and validated.

## Package responsibilities

- `packages/difftale-core`: Git execution, history parsing, commit formatting,
  validation, and reusable interfaces.
- `packages/vscode-difftale`: VS Code commands, model access, Source Control
  integration, virtual revision documents, and navigation UX.

## Completion checks

Run all of these before committing:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
