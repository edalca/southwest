<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="px-4 py-4 bg-amber-500">
        <h2 class="text-xl font-bold text-slate-900">{{ __('Profile') }}</h2>
      </div>
    </ion-header>

    <ion-content style="--background: #f8fafc;">
      <div class="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4" style="color: #0f172a;">

        <!-- Avatar + identity card -->
        <div class="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 bg-blue-950"
          >
            {{ initials }}
          </div>
          <div class="overflow-hidden">
            <p class="font-bold text-gray-900 truncate">{{ displayName }}</p>
            <p class="text-sm text-gray-400 truncate">{{ userEmail }}</p>
          </div>
        </div>

        <!-- App info -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <span class="text-sm text-gray-500">{{ __('Application') }}</span>
            <span class="text-sm font-semibold text-gray-900">Southwest</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3.5">
            <span class="text-sm text-gray-500">{{ __('Version') }}</span>
            <span class="text-sm font-semibold text-gray-900">1.0</span>
          </div>
        </div>

        <!-- Logout -->
        <button
          class="w-full h-13 flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm transition-colors active:opacity-80"
          style="background: #fff1f2; color: #e11d48; height: 52px;"
          :disabled="loggingOut"
          @click="logout"
        >
          <span v-if="loggingOut" class="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin inline-block" />
          <template v-else>
            <!-- Feather: log-out -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {{ __('Sign Out') }}
          </template>
        </button>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { IonPage, IonHeader, IonContent } from '@ionic/vue'
import { session } from '@/data/session'

const __ = inject<(t: string) => string>('$translate', (t) => t)

const loggingOut = ref(false)

const userEmail = computed(() => session.user ?? '')

const displayName = computed(() => {
  const u = userEmail.value
  return u.includes('@') ? u.split('@')[0] : u
})

const initials = computed(() => {
  const name = displayName.value
  return name
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
})

async function logout() {
  loggingOut.value = true
  await session.logout()
  // session.logout() does a full page redirect — no further code runs
}
</script>
