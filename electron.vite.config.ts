import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { randomBytes } from 'node:crypto'

export default defineConfig(({ command }) => {
  // Vite's React refresh preamble needs a per-run nonce in development.
  const nonce = command === 'serve' ? randomBytes(18).toString('base64') : undefined
  return {
    main: {},
    preload: {},
    renderer: {
      html: { cspNonce: nonce },
      plugins: [react(), {
        name: 'development-csp',
        apply: 'serve',
        transformIndexHtml(html) { return html.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`) }
      }]
    }
  }
})
