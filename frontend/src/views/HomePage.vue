<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between px-4 py-4 bg-amber-500">
        <div>
          <p class="text-xs font-medium tracking-wide text-amber-900">{{ greeting }}</p>
          <h1 class="text-lg font-bold text-slate-900 leading-tight">{{ firstName }}</h1>
        </div>
        <div class="flex items-center justify-center w-9 h-9 rounded-full bg-amber-600/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="#1e293b" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
      </div>
    </ion-header>

    <ion-content style="--background: #f8fafc;">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="px-4 pt-5 pb-28 max-w-lg mx-auto space-y-5" style="color: #0f172a;">

        <!-- Date label -->
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest">{{ todayLabel }}</p>

        <!-- Attendance Widget (HRMS home style) -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 pt-5 pb-5">
            <!-- Greeting row -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1 min-w-0">
                <p class="text-base font-bold text-slate-900 leading-snug">
                  {{ greeting }}, {{ firstName }} 👋
                </p>
                <p v-if="attendanceLoading" class="text-xs text-slate-300 mt-1">
                  {{ __('Loading...') }}
                </p>
                <p v-else-if="lastLogSummary" class="text-xs text-slate-400 mt-1">
                  {{ lastLogSummary }}
                  <button
                    class="text-blue-500 font-semibold ml-1"
                    @click="router.push('/tabs/assistance')"
                  >
                    {{ __('View List') }}
                  </button>
                </p>
              </div>
            </div>

            <!-- Location row -->
            <div class="flex items-center gap-1.5 mb-4 min-h-[18px]">
              <template v-if="locationLoading">
                <ion-spinner name="dots" color="medium" style="width:12px;height:12px;flex-shrink:0;" />
                <span class="text-xs text-slate-400">{{ __('Getting your location...') }}</span>
              </template>
              <template v-else-if="locationData">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                     style="flex-shrink:0;">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="text-xs text-slate-400 line-clamp-1">{{ locationData.address }}</span>
              </template>
              <template v-else-if="locationError">
                <button class="flex items-center gap-1" @click="fetchLocation">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                       stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span class="text-xs text-red-400">{{ __('Location unavailable — tap to retry') }}</span>
                </button>
              </template>
            </div>

            <!-- Single contextual button -->
            <ion-button
              expand="block"
              fill="outline"
              :disabled="attendanceLoading || attendanceSubmitting || locationLoading || !locationData"
              @click="doCheckin(checkedIn ? 'OUT' : 'IN')"
              style="
                --border-color: #e2e8f0;
                --background: #f8fafc;
                --background-activated: #e2e8f0;
                --color: #0f172a;
                --border-radius: 12px;
                --padding-top: 14px;
                --padding-bottom: 14px;
                font-weight: 600;
                font-size: 15px;
              "
            >
              <ion-spinner v-if="attendanceSubmitting" name="crescent" color="dark" style="margin-right: 8px;" />
              <template v-else>
                <!-- Circle-plus icon for Check In -->
                <svg v-if="!checkedIn" width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     style="margin-right: 8px; flex-shrink: 0;">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <!-- Circle-minus icon for Check Out -->
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     style="margin-right: 8px; flex-shrink: 0;">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </template>
              {{ checkedIn ? __('Check Out') : __('Check In') }}
            </ion-button>

            <p v-if="attendanceError" class="mt-3 text-xs text-center text-red-500">
              {{ attendanceError }}
            </p>
          </div>
        </div>

        <!-- Recent Work Orders -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {{ __("Recent Orders") }}
            </span>
            <ion-button
              size="small"
              fill="clear"
              class="text-xs font-semibold"
              style="--color: #172554; margin: 0; --padding-end: 0;"
              @click="router.push('/tabs/orders')"
            >
              {{ __('View All') }}
            </ion-button>
          </div>

          <div v-if="swoList.loading" class="space-y-3">
            <div v-for="n in 3" :key="n" class="animate-pulse rounded-xl bg-white h-16 shadow-sm" />
          </div>

          <div
            v-else-if="!swoList.data || swoList.data.length === 0"
            class="rounded-xl bg-white p-6 shadow-sm text-center"
          >
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mx-auto mb-3">
              <svg class="text-slate-200" width="24" height="24"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p class="text-sm font-medium text-slate-500">{{ __('No recent orders.') }}</p>
            <p class="text-xs text-slate-400 mt-1">
              {{ __('No activity found in the last') }} {{ hoursLimit }} {{ __('hours.') }}
            </p>
          </div>

          <ion-list v-else class="space-y-2" style="--background: transparent; background: transparent;">
            <ion-item
              v-for="order in swoList.data"
              :key="order.name"
              button
              :detail="false"
              class="swo-item rounded-xl overflow-hidden shadow-sm"
              @click="openModal(order.name)"
              style="--background: #ffffff; --border-width: 0; --inner-padding-end: 0; --padding-start: 0; margin-bottom: 10px;"
            >
              <div class="flex flex-col w-full p-4">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div class="flex flex-col">
                    <span class="font-bold text-slate-900 text-sm leading-snug">
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
                <p class="text-xs text-slate-400 line-clamp-1">
                  {{ __(order.service_type) }} &middot; {{ order.customer }}
                </p>
              </div>
            </ion-item>
          </ion-list>
        </div>

        <!-- PWA install card -->
        <div v-if="pwaInstallPrompt || iosInstallPrompt" class="bg-blue-950 rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-white text-sm">{{ __('Install App') }}</p>
              <p class="text-xs text-white/40">{{ __('Add to your home screen') }}</p>
            </div>
          </div>
          <ion-button
            v-if="pwaInstallPrompt"
            class="mt-2"
            expand="block"
            color="light"
            @click="installPwa"
          >
            {{ __('Install') }}
          </ion-button>
          <div v-else-if="iosInstallPrompt">
            <ion-button
              v-if="!showIosInstructions"
              class="mt-2"
              expand="block"
              color="light"
              @click="showIosInstructions = true"
            >
              {{ __('How to Install') }}
            </ion-button>
            <div
              v-else
              class="rounded-xl p-3 text-sm space-y-1.5 bg-white/10 text-white/75"
            >
              <p class="font-semibold text-white">{{ __('To install on iPhone:') }}</p>
              <p>{{ __('1. Tap the Share button (↑)') }}</p>
              <p>{{ __('2. Select "Add to Home Screen"') }}</p>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Unified create / edit modal -->
    <SWOFormModal
      v-model:is-open="showModal"
      :swo-name="activeSwoName"
      @status-updated="swoList.reload()"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonContent,
  IonRefresher, IonRefresherContent,
  IonButton, IonSpinner,
  IonList, IonItem,
  onIonViewWillEnter,
} from '@ionic/vue'
import { createResource } from 'frappe-ui'
import { useTime } from '@/composables/useTime'
import { pwaInstallPrompt, iosInstallPrompt } from '@/pwa'
import { session } from '@/data/session'
import { getAttendanceStatus, addCheckinLog, type ServiceWorkOrder } from '@/services/api'
import { useAttendanceLocation } from '@/composables/useAttendanceLocation'
import SWOFormModal from '@/components/SWOFormModal.vue'

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── Modal State ──────────────────────────────────────────────────────────────
const showModal     = ref(false)
const activeSwoName = ref<string | null>(null)

// ── App Settings ──────────────────────────────────────────────────────────────
const appSettings = createResource({
  url: 'frappe.client.get_value',
  params: {
    doctype: 'Service Manager Settings',
    fieldname: 'recent_orders_hours',
  },
  auto: true,
})

const hoursLimit = computed(() => appSettings.data?.recent_orders_hours || 24)

// ── Greeting ───────────────────────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return __('Good morning')
  if (h < 18) return __('Good afternoon')
  return __('Good evening')
})

const firstName = computed(() => {
  const u = session.user ?? ''
  const base = u.includes('@') ? u.split('@')[0] : u
  return base.charAt(0).toUpperCase() + base.slice(1)
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
)

// ── Location ───────────────────────────────────────────────────────────────────
const { locationLoading, locationData, locationError, fetchLocation } = useAttendanceLocation()

// ── Attendance ─────────────────────────────────────────────────────────────────
const checkedIn            = ref(false)
const attendanceLoading    = ref(false)
const attendanceSubmitting = ref(false)
const attendanceError      = ref('')
const pendingLog           = ref<'IN' | 'OUT' | ''>('')
const lastLogTime          = ref<string | null>(null)
const lastLogType          = ref<string | null>(null)

const lastLogSummary = computed(() => {
  if (!lastLogTime.value || !lastLogType.value) return null
  const t = new Date(lastLogTime.value)
  const timeStr = t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return lastLogType.value === 'IN'
    ? `${__('Last check-in was at')} ${timeStr}`
    : `${__('Last check-out was at')} ${timeStr}`
})

async function loadAttendanceStatus() {
  attendanceLoading.value = true
  attendanceError.value   = ''
  try {
    const result = await getAttendanceStatus()
    checkedIn.value   = result.checked_in ?? false
    lastLogTime.value = result.last_log_time ?? null
    lastLogType.value = result.last_log_type ?? null
  } catch {
    checkedIn.value = false
  } finally {
    attendanceLoading.value = false
  }
}

async function doCheckin(log_type: 'IN' | 'OUT') {
  if (attendanceSubmitting.value) return
  if (!locationData.value) {
    attendanceError.value = __('Location is not available yet. Please wait or retry.')
    return
  }
  attendanceSubmitting.value = true
  attendanceError.value      = ''
  pendingLog.value           = log_type
  try {
    await addCheckinLog(log_type, session.user ?? '', locationData.value.latitude, locationData.value.longitude)
    checkedIn.value   = log_type === 'IN'
    lastLogType.value = log_type
    lastLogTime.value = new Date().toISOString()
  } catch (err: unknown) {
    const e = err as { messages?: string[]; message?: string }
    attendanceError.value = e?.messages?.[0] ?? e?.message ?? __('Attendance update failed.')
  } finally {
    attendanceSubmitting.value = false
    pendingLog.value           = ''
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function openModal(swoName: string | null) {
  activeSwoName.value = swoName
  showModal.value     = true
}

// ── Work Orders ────────────────────────────────────────────────────────────────
const swoList = createResource({
  url: 'southwest.api.get_technician_swos',
  params: {
    hours_limit: hoursLimit.value,
  },
  auto: true,
})

watch(hoursLimit, (newVal) => {
  swoList.params = { hours_limit: newVal }
  swoList.reload()
})

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(() => {
  loadAttendanceStatus()
  fetchLocation()
})

onIonViewWillEnter(() => {
  loadAttendanceStatus()
  swoList.reload()
})

async function onRefresh(event: CustomEvent) {
  await Promise.all([
    loadAttendanceStatus(),
    appSettings.reload(),
    swoList.reload(),
  ])
  ;(event.target as HTMLIonRefresherElement).complete()
}

// ── PWA ────────────────────────────────────────────────────────────────────────
const showIosInstructions = ref(false)

function installPwa() {
  if (pwaInstallPrompt.value) {
    pwaInstallPrompt.value.prompt()
    pwaInstallPrompt.value.userChoice.then((choice: { outcome: string }) => {
      if (choice.outcome === 'accepted') pwaInstallPrompt.value = null
    })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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
