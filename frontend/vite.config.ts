import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

/**
 * Emits dist/sw.js with the list of every built file, so the whole app
 * (pages, fonts, phrasebook, offline assistant) opens without a network.
 */
function precacheServiceWorker(): Plugin {
  return {
    name: 'tripdrip-precache-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((name) => !name.endsWith('.map') && name !== 'index.html')
        .map((name) => `/${name}`)
      const extras = ['/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']
      const list = [...files, ...extras]
      const version = createHash('sha256').update(list.join('|')).digest('hex').slice(0, 12)
      const template = readFileSync(new URL('./sw/service-worker.js', import.meta.url), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(list)),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheServiceWorker()],
  server: {
    port: 5173,
  },
})
