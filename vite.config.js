import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Shown on screen so a push can be confirmed to have redeployed.
  define: {
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    ),
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest lets us own the service worker source. Stage 8 adds the
      // push handler to src/sw.js; the generateSW strategy would overwrite it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'meal-log',
        short_name: 'meal-log',
        description: 'Log meals and food spending',
        lang: 'ja',
        start_url: '/',
        scope: '/',
        // standalone hides the browser chrome, and iOS only offers the push
        // permission prompt to an app launched from the home screen.
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2d3b2d',
        theme_color: '#2d3b2d',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
