<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <FormModal />

      <ion-tab-bar slot="bottom" class="app-tab-bar">

        <ion-tab-button tab="home" href="/tabs/home" class="app-tab-btn">
          <div :class="iconWrap('home')">
            <!-- Feather: home -->
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="tab-label">{{ __('Home') }}</span>
          </div>
        </ion-tab-button>

        <ion-tab-button tab="orders" href="/tabs/orders" class="app-tab-btn">
          <div :class="iconWrap('orders')">
            <!-- Feather: clipboard -->
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span class="tab-label">{{ __('Orders') }}</span>
          </div>
        </ion-tab-button>

        <ion-tab-button tab="agenda" href="/tabs/agenda" class="app-tab-btn">
          <div :class="iconWrap('agenda')">
            <!-- Feather: calendar -->
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="tab-label">{{ __('Agenda') }}</span>
          </div>
        </ion-tab-button>

        <ion-tab-button tab="assistance" href="/tabs/assistance" class="app-tab-btn">
          <div :class="iconWrap('assistance')">
            <!-- Feather: clock -->
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="tab-label">{{ __('Attendance') }}</span>
          </div>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile" class="app-tab-btn">
          <div :class="iconWrap('profile')">
            <!-- Feather: user -->
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="tab-label">{{ __('Profile') }}</span>
          </div>
        </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
} from '@ionic/vue'
import FormModal from '@/components/orders/FormModal.vue'

const route = useRoute()
const __ = inject<(t: string) => string>('$translate', (t) => t)

function iconWrap(tab: string): string {
  const active = route.path.startsWith(`/tabs/${tab}`)
  return [
    'flex flex-col items-center justify-center gap-0.5 py-1 w-full',
    active ? 'text-gray-900' : 'text-gray-400',
  ].join(' ')
}
</script>

<style>
/* IonTabBar lives in shadow DOM — use global CSS to override its defaults */
.app-tab-bar {
  --background: #ffffff;
  --border: 1px solid #e5e7eb;
  --color: #9ca3af;
  --color-selected: #111827;
  height: 60px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.app-tab-btn {
  --ripple-color: transparent;
  --color: #9ca3af;
  --color-selected: #111827;
}

/* Remove Ionic's default selected underline indicator */
.app-tab-btn::part(native)::after {
  display: none;
}

.tab-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
}
</style>
