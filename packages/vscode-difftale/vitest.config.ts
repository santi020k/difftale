import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      vscode: new URL('./tests/vscode.ts', import.meta.url).pathname
    }
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    },
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
