'use strict'

const { execSync } = require('node:child_process')
const { readFileSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')
const packagePath = resolve(__dirname, '../package.json')
const workspacePath = resolve(__dirname, '../../../pnpm-workspace.yaml')
const originalPackageContent = readFileSync(packagePath, 'utf8')
const workspaceContent = readFileSync(workspacePath, 'utf8')
const packageManifest = JSON.parse(originalPackageContent)

const resolveCatalogVersion = packageName => {
  const patterns = [`"${packageName}":`, `'${packageName}':`, `${packageName}:`]

  for (const line of workspaceContent.split('\n')) {
    const trimmedLine = line.trimStart()

    for (const pattern of patterns) {
      if (trimmedLine.startsWith(pattern)) {
        return trimmedLine.slice(pattern.length).trim() || undefined
      }
    }
  }
}

const resolveDependencySection = section => {
  if (!section) {
    return
  }

  for (const [packageName, version] of Object.entries(section)) {
    if (version === 'catalog:') {
      const resolvedVersion = resolveCatalogVersion(packageName)

      if (resolvedVersion) {
        section[packageName] = resolvedVersion
      }
    }
  }
}

resolveDependencySection(packageManifest.dependencies)

resolveDependencySection(packageManifest.devDependencies)

try {
  writeFileSync(packagePath, `${JSON.stringify(packageManifest, null, 2)}\n`)

  execSync('pnpm dlx @vscode/vsce package --no-dependencies --out difftale.vsix', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit'
  })
} finally {
  writeFileSync(packagePath, originalPackageContent)
}
