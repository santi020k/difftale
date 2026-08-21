const esbuild = require('esbuild')
const watch = process.argv.includes('--watch')

const buildOptions = {
  bundle: true,
  entryPoints: ['src/extension.ts'],
  external: ['vscode'],
  format: 'cjs',
  logLevel: 'info',
  minify: false,
  outfile: 'dist/extension.js',
  platform: 'node',
  sourcemap: true,
  target: 'node22'
}

const run = async () => {
  if (watch) {
    const context = await esbuild.context(buildOptions)

    await context.watch()

    return
  }

  await esbuild.build(buildOptions)
}

run().catch(error => {
  console.error(error)

  process.exitCode = 1
})
