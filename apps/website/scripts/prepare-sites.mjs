import { mkdir, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)))
const outputDirectory = join(projectDirectory, 'dist')
const clientDirectory = join(outputDirectory, 'client')
const serverDirectory = join(outputDirectory, 'server')

await mkdir(clientDirectory, { recursive: true })

for (const entry of await readdir(outputDirectory)) {
  if (entry === 'client' || entry === 'server' || entry === '.openai')
    continue

  await rename(join(outputDirectory, entry), join(clientDirectory, entry))
}

await mkdir(serverDirectory, { recursive: true })

await writeFile(
  join(serverDirectory, 'index.js'), `const metadataHandlers = [
  ["link[rel='canonical']", "href", request => request.url],
  ["meta[property='og:url']", "content", request => request.url],
  ["meta[property='og:image']", "content", request => new URL('/og.png', request.url).toString()],
  ["meta[name='twitter:image']", "content", request => new URL('/og.png', request.url).toString()]
]

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.includes('text/html'))
      return response

    let rewriter = new HTMLRewriter()
    for (const [selector, attribute, getValue] of metadataHandlers) {
      rewriter = rewriter.on(selector, {
        element(element) {
          element.setAttribute(attribute, getValue(request))
        }
      })
    }

    return rewriter.transform(response)
  }
}
`
)
