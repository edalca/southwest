<template>
  <ion-page>

    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between bg-amber-500 px-4 py-4">
        <h2 class="text-xl font-bold text-slate-900">{{ __('Work Orders') }}</h2>
        <ion-button
          fill="clear"
          size="small"
          class="refresh-btn"
          @click="swoList.reload()"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </ion-button>
      </div>

      <!-- Segment Filter -->
      <ion-toolbar class="bg-amber-500 px-2 pb-2">
        <ion-segment v-model="selectedSegment" mode="ios">
          <ion-segment-button value="active">
            <ion-label class="text-[11px] font-bold">{{ __('ACTIVE') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="programmed">
            <ion-label class="text-[11px] font-bold">{{ __('PROGRAMMED') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="all">
            <ion-label class="text-[11px] font-bold">{{ __('ALL') }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
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
        <ion-button
          fill="outline"
          color="medium"
          size="small"
          @click="swoList.reload()"
        >
          {{ __('Retry') }}
        </ion-button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredOrders.length === 0"
        class="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center"
      >
        <svg class="text-slate-200" width="52" height="52" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
        <p class="text-sm text-slate-400">
          {{ selectedSegment === 'all' 
             ? __('No work orders assigned to you.') 
             : selectedSegment === 'active'
               ? __('No active repairs found.')
               : __('No maintenance programmed.')
          }}
        </p>
      </div>

      <!-- Order cards -->
      <ion-list v-else class="space-y-4 bg-transparent p-4 pb-28">
        <ion-item
          v-for="order in filteredOrders"
          :key="order.name"
          button
          :detail="false"
          class="swo-item rounded-xl overflow-hidden shadow-sm"
          style="--inner-padding-end: 0; --padding-start: 0; margin-bottom: 12px;"
          @click="openModal(order.name)"
        >
          <div class="flex flex-col w-full p-4">
            <div class="flex items-start justify-between gap-2 mb-1">
              <div>
                <span class="font-bold text-gray-900 text-sm leading-snug">
                  {{ order.work_order_number || order.name }}
                </span>
                <p class="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                  {{ formatTimeAgo(order.time_ago_minutes) }}
                </p>
              </div>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                :class="statusClass(order.status)"
              >
                {{ __(order.status) }}
              </span>
            </div>
            <p class="text-xs font-medium text-slate-500 mt-1.5">{{ __(order.service_type) }}</p>
            <div class="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
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
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="mb-20">
        <ion-fab-button color="dark" @click="openModal(null)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </ion-fab-button>
      </ion-fab>

    </ion-content>

    <!-- Unified create / edit modal -->
    <SWOFormModal
      v-model:is-open="showModal"
      :swo-name="activeSwoName"
      @saved="onModalSaved"
      @status-updated="swoList.reload()"
    />

  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonContent, IonToolbar,
  IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonButton, IonFab, IonFabButton,
  onIonViewWillEnter,
} from '@ionic/vue'
import { createResource } from 'frappe-ui'
import { useTime } from '@/composables/useTime'
import { session } from '@/data/session'
import { formatDate } from '@/utils/date'
import { getSWOs, type ServiceWorkOrder } from '@/services/api'
import SWOFormModal from '@/components/SWOFormModal.vue'

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)

// Modal state — shared for both create (null) and edit (name string)
const showModal    = ref(false)
const activeSwoName = ref<string | null>(null)

// ── Segment Navigation ────────────────────────────────────────────────────────
const selectedSegment = ref<'active' | 'programmed' | 'all'>('active')

const filteredOrders = computed(() => {
  const data = swoList.data || []
  if (selectedSegment.value === 'all') return data

  const activeStatuses = ['New', 'Repairing', 'Partial Repair']
  if (selectedSegment.value === 'active') {
    return data.filter((o: ServiceWorkOrder) => activeStatuses.includes(o.status))
  } else {
    // Programmed
    return data.filter((o: ServiceWorkOrder) => o.status === 'Programmed')
  }
})

// ── Data ──────────────────────────────────────────────────────────────────────
const swoList = createResource({
  url: 'southwest.api.get_technician_swos',
  auto: true,
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
    Repairing:       'bg-amber-100 text-amber-800',
    'Partial Repair':'bg-amber-100 text-amber-800',
    Staged:          'bg-blue-100 text-blue-800',
    Completed:       'bg-emerald-100 text-emerald-800',
    Billed:          'bg-emerald-100 text-emerald-800',
    Issued:          'bg-emerald-100 text-emerald-800',
    Closed:          'bg-emerald-100 text-emerald-800',
    Cancelled:       'bg-red-100 text-red-600',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

const { formatTimeAgo } = useTime()
</script>

<style scoped>
.refresh-btn {
  --color: #334155;
  --background: transparent;
  margin: 0;
}

.swo-item {
  --background: #ffffff;
  --border-radius: 12px;
}
</style>
