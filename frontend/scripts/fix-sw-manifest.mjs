/**
 * Prefixes the web manifest entry in the generated service worker precache list.
 *
 * vite-plugin-pwa pushes the manifest onto `workbox.additionalManifestEntries`,
 * which workbox appends after `manifestTransforms` run and outside the reach of
 * `modifyURLPrefix`. The entry therefore ships as a bare "manifest.webmanifest"
 * while every other entry carries the asset prefix. Since the service worker is
 * served from /sw.js, that bare URL resolves to /manifest.webmanifest, which 404s
 * and makes workbox abort the whole precache install — leaving the app with no
 * offline cache at all.
 *
 * Runs between `vite build` and the copy into southwest/www, so both copies of
 * sw.js end up fixed.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SW_PATH = new URL('../../southwest/public/frontend/sw.js', import.meta.url)
const PREFIX = 'assets/southwest/frontend/'
const BARE_ENTRY = 'url:"manifest.webmanifest"'

const source = readFileSync(SW_PATH, 'utf8')

if (source.includes(`url:"${PREFIX}manifest.webmanifest"`)) {
  console.log('fix-sw-manifest: manifest entry already prefixed, nothing to do')
  process.exit(0)
}

if (!source.includes(BARE_ENTRY)) {
  // The plugin changed its output shape — fail loudly rather than ship a broken SW.
  console.error(`fix-sw-manifest: could not find ${BARE_ENTRY} in sw.js`)
  process.exit(1)
}

writeFileSync(SW_PATH, source.replace(BARE_ENTRY, `url:"${PREFIX}manifest.webmanifest"`))
console.log(`fix-sw-manifest: prefixed manifest.webmanifest with ${PREFIX}`)
