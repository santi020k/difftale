import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [sitemap()],
  output: 'static',
  site: 'https://difftale.santi020k.com'
})
