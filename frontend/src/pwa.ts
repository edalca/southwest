import { ref } from 'vue'

export const pwaInstallPrompt = ref<any>(null)
export const iosInstallPrompt = ref<boolean>(false)

export const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

export const isInStandaloneMode = () => {
  const nav = window.navigator as any
  return ('standalone' in nav && nav.standalone === true) || window.matchMedia('(display-mode: standalone)').matches
}

export function initPWA() {
  if (isIos() && !isInStandaloneMode()) {
    iosInstallPrompt.value = true
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later.
    pwaInstallPrompt.value = e
  })

  window.addEventListener('appinstalled', () => {
    // Clear the prompt
    pwaInstallPrompt.value = null
    iosInstallPrompt.value = false
  })
}
