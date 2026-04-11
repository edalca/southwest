<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="bg-gray-900 px-4 py-4 shadow-sm flex items-center justify-between">
        <h2 class="text-xl font-bold text-white">{{ __('Southwest') }}</h2>
        <Button variant="ghost" class="!px-2 text-gray-300 hover:bg-gray-800" @click="logout" title="Logout">
          <FeatherIcon name="power" class="h-5 w-5" />
        </Button>
      </div>
    </ion-header>

    <ion-content class="bg-gray-50">
      <div class="px-4 py-6 max-w-lg mx-auto space-y-6">
        
        <!-- Welcome Message -->
        <div class="text-center space-y-2 mt-4">
          <div class="inline-flex items-center justify-center p-4 bg-gray-200 rounded-full mb-2">
             <FeatherIcon name="tool" class="h-8 w-8 text-gray-700" />
          </div>
          <h1 class="text-2xl font-bold text-gray-800">{{ __('Welcome back!') }}</h1>
          <p class="text-gray-500 text-sm">{{ __('Service Management Portal') }}</p>
        </div>

        <!-- Navigation Menus -->
        <div class="grid gap-4 mt-8">
          <!-- SWO Menu -->
          <div 
            @click="goTo('/swo')"
            class="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-4">
              <div class="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <FeatherIcon name="clipboard" class="h-6 w-6" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800">{{ __('Work Orders') }}</h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ __('View and manage your service tickets') }}</p>
              </div>
            </div>
            <FeatherIcon name="chevron-right" class="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <!-- Install PWA Card -->
        <div v-if="pwaInstallPrompt || iosInstallPrompt" class="mt-8 bg-indigo-50 rounded-xl p-5 border border-indigo-100 shadow-sm">
           <div class="flex items-start gap-3 mb-4">
             <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg flex-shrink-0">
                <FeatherIcon name="download" class="h-6 w-6" />
             </div>
             <div>
               <h3 class="font-bold text-indigo-900">{{ __('Install Southwest App') }}</h3>
               <p class="text-xs font-medium text-indigo-700 mt-1 leading-snug">
                 {{ __('Get the app on your device for easy access and a better experience!') }}
               </p>
             </div>
           </div>
           
           <Button v-if="pwaInstallPrompt" variant="solid" class="w-full !bg-indigo-600 hover:!bg-indigo-700" @click="installPwa">
             {{ __('Install App') }}
           </Button>

           <div v-else-if="iosInstallPrompt">
             <Button v-if="!showIosInstructions" variant="solid" class="w-full !bg-indigo-600 hover:!bg-indigo-700" @click="showIosInstructions = true">
               {{ __('Install App') }}
             </Button>
             <div v-else class="bg-indigo-100 text-indigo-800 p-3 rounded-lg text-sm flex flex-col gap-2 transition-all">
               <span class="font-semibold">{{ __('To install on iPhone:') }}</span>
               <span class="inline-flex items-center gap-1">
                 {{ __('1. Tap') }} <FeatherIcon name="share" class="h-4 w-4" /> {{ __('Share') }}
               </span>
               <span class="inline-flex items-center gap-1">
                 {{ __('2. Tap') }} <FeatherIcon name="plus-square" class="h-4 w-4" /> {{ __('"Add to Home Screen"') }}
               </span>
             </div>
           </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonContent } from '@ionic/vue'
import { Button, FeatherIcon } from 'frappe-ui'
import { pwaInstallPrompt, iosInstallPrompt } from '@/pwa'
import { session } from '@/data/session'

const showIosInstructions = ref(false)

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)

function goTo(path: string) {
  router.push(path)
}

function installPwa() {
  if (pwaInstallPrompt.value) {
    pwaInstallPrompt.value.prompt()
    pwaInstallPrompt.value.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        pwaInstallPrompt.value = null
      }
    })
  }
}

async function logout() {
  await session.logout()
}
</script>
