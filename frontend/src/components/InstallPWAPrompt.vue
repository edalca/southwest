<template>
  <div v-if="showDialog || iosInstallMessage" class="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 pointer-events-none">
    <!-- Android Install Prompt -->
    <div v-if="showDialog" class="bg-white rounded-xl shadow-2xl border border-slate-100 p-4 pointer-events-auto flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-slate-900 m-0">Install Southwest App</h3>
        <button @click="closePrompt" class="text-slate-400 p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <p class="text-sm text-slate-600 m-0">Get the app on your device for fast access and offline support!</p>
      <button @click="install" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 rounded-lg shadow-sm transition-colors text-sm">
        Install Application
      </button>
    </div>

    <!-- iOS Installation Info -->
    <div v-if="iosInstallMessage" class="bg-blue-50 rounded-xl shadow-2xl border border-blue-100 p-4 pointer-events-auto flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-slate-900 m-0">Install on iOS</h3>
        <button @click="closePrompt" class="text-slate-400 p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <p class="text-sm text-slate-700 m-0 leading-relaxed">
        To install, tap 
        <svg class="inline-block mx-1 w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> 
        and select <strong>"Add to Home Screen"</strong>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"

const deferredPrompt = ref<any>(null)
const showDialog = ref(false)
const iosInstallMessage = ref(false)

const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

const isInStandaloneMode = () =>
  ("standalone" in window.navigator && (window.navigator as any).standalone) ||
  window.matchMedia('(display-mode: standalone)').matches

const closePrompt = () => {
  showDialog.value = false
  iosInstallMessage.value = false
}

const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault()
  deferredPrompt.value = e
  
  if (isIos() && !isInStandaloneMode()) {
    iosInstallMessage.value = true
  } else {
    showDialog.value = true
  }
}

const handleAppInstalled = () => {
  showDialog.value = false
  deferredPrompt.value = null
}

onMounted(() => {
  if (isIos() && !isInStandaloneMode()) {
    iosInstallMessage.value = true
  }
  
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  window.addEventListener("appinstalled", handleAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  window.removeEventListener("appinstalled", handleAppInstalled)
})

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  console.log(`User response to the install prompt: ${outcome}`)
  deferredPrompt.value = null
  showDialog.value = false
}
</script>
