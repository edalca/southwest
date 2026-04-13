<template>
  <ion-page>

    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between bg-amber-500 px-4 py-4">
        <h2 class="text-xl font-bold text-slate-900">{{ __('Work Orders') }}</h2>
        <button
          class="flex items-center justify-center w-8 h-8 rounded-xl text-slate-700 active:bg-amber-600/30 transition-colors"
          @click="swoList.reload()"
          :title="__('Refresh')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
    </ion-header>

    <ion-content style="--background: #f8fafc;">

      <!-- Pull-to-refresh -->
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeletons -->
      <div v-if="swoList.loading" class="space-y-3 p-4">
        <div v-for="n in 5" :key="n" class="animate-pulse rounded-xl bg-white p-4 shadow-sm">
          <div class="mb-2 h-4 w-1/2 rounded-lg bg-slate-100" />
          <div class="mb-1 h-3 w-1/3 rounded-lg bg-slate-100" />
          <div class="h-3 w-2/3 rounded-lg bg-slate-100" />
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="swoList.error"
        class="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center"
      >
        <svg class="text-red-300" width="48" height="48" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="text-sm text-slate-500">{{ swoList.error.message }}</p>
        <button
          class="px-4 h-9 rounded-xl border border-slate-200 bg-white text-sm font-medium text-gray-700 active:bg-slate-50"
          @click="swoList.reload()"
        >
          {{ __('Retry') }}
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!swoList.data?.length"
        class="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center"
      >
        <svg class="text-slate-200" width="52" height="52" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
        <p class="text-sm text-slate-400">{{ __('No work orders assigned to you.') }}</p>
      </div>

      <!-- Order cards — tap to open modal in edit mode -->
      <div v-else class="space-y-2.5 p-4 pb-28">
        <div
          v-for="order in swoList.data"
          :key="order.name"
          class="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:bg-slate-50 transition-colors"
          @click="openModal(order.name)"
        >
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <span class="font-bold text-gray-900 text-sm leading-snug">
              {{ order.work_order_number || order.name }}
            </span>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              :class="statusClass(order.status)"
            >
              {{ __(order.status) }}
            </span>
          </div>
          <p class="text-xs font-medium text-slate-500 mb-1.5">{{ __(order.service_type) }}</p>
          <div class="flex items-center gap-3 text-xs text-slate-400">
            <span class="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {{ order.customer || '—' }}
            </span>
            <span class="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDate(order.scheduled_date) }}
            </span>
          </div>
        </div>
      </div>

      <!-- FAB: New Work Order (Navy Blue) -->
      <div class="fixed bottom-20 right-5 z-10">
        <button
          class="w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:opacity-80 transition-opacity"
          style="background: #172554;"
          :title="__('New Work Order')"
          @click="openModal(null)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="white" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

    </ion-content>

    <!-- Unified create / edit modal -->
    <SWOFormModal
      v-model:is-open="showModal"
      :swo-name="activeSwoName"
      @saved="onModalSaved"
    />

  </ion-page>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonContent,
  IonRefresher, IonRefresherContent,
  onIonViewWillEnter,
} from '@ionic/vue'
import { createResource } from 'frappe-ui'
import { formatDate } from '@/utils/date'
import SWOFormModal from '@/components/SWOFormModal.vue'

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)

// Modal state — shared for both create (null) and edit (name string)
const showModal    = ref(false)
const activeSwoName = ref<string | null>(null)

// ── Data ──────────────────────────────────────────────────────────────────────
const swoList = createResource({
  url: 'southwest.api.get_technician_swos',
  method: 'GET',
  auto: true,
  onError(error: { exc_type?: string }) {
    if (error?.exc_type === 'AuthenticationError') {
      router.replace({ name: 'Login' })
    }
  },
})

onIonViewWillEnter(() => swoList.reload())

// ── Actions ───────────────────────────────────────────────────────────────────
function openModal(swoName: string | null) {
  activeSwoName.value = swoName
  showModal.value     = true
}

async function onRefresh(event: CustomEvent) {
  await swoList.reload()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function onModalSaved() {
  showModal.value = false
  swoList.reload()
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusClass(status: string): string {
  const map: Record<string, string> = {
    New:             'bg-slate-100 text-slate-600',
    Programmed:      'bg-blue-100 text-blue-800',
    Released:        'bg-blue-100 text-blue-800',
    Repairing:       'bg-amber-100 text-amber-800',
    'Partial Repair':'bg-amber-100 text-amber-800',
    Staged:          'bg-blue-100 text-blue-800',
    Completed:       'bg-emerald-100 text-emerald-800',
    Invoiced:        'bg-slate-100 text-slate-500',
    Cancelled:       'bg-red-100 text-red-600',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}
</script>
