import { defineConfig, Extension } from '@santi020k/eslint-config-basic'

export default defineConfig(
  {
    extensions: [Extension.Boundaries, Extension.Unicorn],
    workspacePrefixes: ['@santi020k'],
  },
  {
    files: ['packages/vscode-difftale/scripts/**/*.cjs'],
    name: 'build-scripts',
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['packages/vscode-difftale/src/extension.ts'],
    name: 'extension-subscription-registration-layout',
    rules: {
      '@stylistic/function-call-argument-newline': 'off',
    },
  },
)
