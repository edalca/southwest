import vue from '@vitejs/plugin-vue'
import frappeui from 'frappe-ui/vite'
import path from 'path'
import fs from 'fs'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Renames .mjs assets to .js in the build output so nginx serves them
 * with the correct application/javascript MIME type (nginx's default
 * mime.types does not include .mjs, causing module load failures).
 */
function mjsToJs(): Plugin {
  return {
    name: 'mjs-to-js',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const name of Object.keys(bundle)) {
        if (name.endsWith('.mjs')) {
          const chunk = bundle[name]
          const newName = name.replace(/\.mjs$/, '.js')
          chunk.fileName = chunk.fileName.replace(/\.mjs$/, '.js')
          bundle[newName] = chunk
          delete bundle[name]
        }
      }
    },
    renderChunk(code) {
      return { code: code.replace(/\.mjs(['"])/g, '.js$1'), map: null }
    },
  }
}

/**
 * frappe-ui's TextEditor component uses ~icons/lucide/* (unplugin-icons).
 * Since we don't use TextEditor, stub all icon imports with an empty component.
 * The plugin must intercept both at Vite level AND inside esbuild's dep scanner.
 */
const ICON_STUB_CONTENTS = `import { defineComponent } from 'vue'
export default defineComponent({ template: '<span />' })`

function iconStubPlugin(): Plugin {
  const STUB_ID = '\0~icon-stub'
  return {
    name: 'icon-stub',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith('~icons/')) return STUB_ID
    },
    load(id) {
      if (id === STUB_ID) return ICON_STUB_CONTENTS
    },
  }
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8100,
    watch: {
      usePolling: true,
      interval: 500,
    },
    proxy: {
      '^/(app|login|api|assets|files|private)': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
    allowedHosts: true,
  },
  plugins: [
    mjsToJs(),
    iconStubPlugin(),
    frappeui({
      frappeProxy: false,
      buildConfig: {
        outDir: '../southwest/public/frontend',
        baseUrl: '/assets/southwest/frontend/',
        indexHtmlPath: '../southwest/www/southwest.html',
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      base: '/assets/southwest/frontend/',
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: null,
        modifyURLPrefix: {
          '': 'assets/southwest/frontend/'
        },
        manifestTransforms: [
          async (manifestEntries) => {
            const manifest = manifestEntries.filter((entry) => !entry.url.includes('manifest.webmanifest'))
            return { manifest, warnings: [] }
          }
        ]
      },
      manifest: {
        id: '/southwest',
        start_url: '/southwest',
        scope: '/southwest/',
        name: 'Southwest',
        short_name: 'Southwest',
        theme_color: '#0f172a', /* Navy Blue */
        background_color: '#f8fafc', /* Slate 50 */
        display: 'standalone',
        icons: [
          {
            src: '/assets/southwest/manifest/manifest-icon.maskable.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/southwest/manifest/manifest-icon.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
    }),
    vue(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['frappe-ui > feather-icons', 'tailwind.config.js', 'debug'],
    esbuildOptions: {
      plugins: [
        {
          name: 'icon-stub',
          setup(build) {
            build.onResolve({ filter: /^~icons\// }, () => ({
              path: 'icon-stub',
              namespace: 'icon-stub',
            }))
            build.onLoad({ filter: /.*/, namespace: 'icon-stub' }, () => ({
              contents: ICON_STUB_CONTENTS,
              loader: 'js',
            }))
          },
        },
      ],
    },
  },
})
