import { defineConfig, Extension, Format, Preset, Runtime, Testing, Tool } from '@santi020k/eslint-config-basic'

import eslintPluginAstro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'

export default await defineConfig(
  {
    autoFrameworks: false,
    detection: { libraries: false },
    detectRootDir: import.meta.dirname,
    extensions: [Extension.Boundaries, Extension.Unicorn],
    formats: [Format.Jsonc, Format.Markdown],
    preset: Preset.Monorepo,
    projects: {
      'packages/difftale-core': {
        preset: Preset.Library,
        runtime: Runtime.Node,
      },
      'packages/vscode-difftale': {
        preset: Preset.Library,
        runtime: Runtime.Node,
      },
    },
    testing: [Testing.Vitest],
    tools: [Tool.Pnpm],
    tsconfigRootDir: import.meta.dirname,
    typescript: {
      projectService: {
        allowDefaultProject: ['*.ts', '*.js', '**/*.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
        defaultProject: 'tsconfig.eslint.json',
      },
    },
    workspacePrefixes: ['@santi020k'],
  },
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    ...tseslint.configs.disableTypeChecked,
    files: ['apps/website/**/*.astro'],
    name: 'astro-files',
  },
  {
    files: ['packages/vscode-difftale/src/**/*.ts'],
    name: 'vscode-extension-api',
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },
  {
    files: ['packages/vscode-difftale/scripts/**/*.cjs'],
    name: 'build-scripts',
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.config.ts', '**/*.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
)
