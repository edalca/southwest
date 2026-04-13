<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between px-4 py-4 bg-amber-500">
        <div>
          <p class="text-xs font-medium tracking-wide text-amber-900">{{ greeting }}</p>
          <h1 class="text-lg font-bold text-slate-900 leading-tight">{{ displayName }}</h1>
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

        <!-- Attendance Widget -->
        <div class="bg-blue-950 rounded-2xl overflow-hidden shadow-sm">
          <div class="px-5 pt-5 pb-5">
            <div class="flex items-center justify-between mb-5">
              <span class="text-xs font-semibold tracking-widest uppercase text-blue-300/60">
                {{ __('Attendance') }}
              </span>
              <span v-if="attendanceLoading" class="text-xs text-white/25">
                {{ __('Loading...') }}
              </span>
              <!-- Status badge -->
              <span
                v-else
                class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors"
                :class="checkedIn
                  ? 'bg-amber-500/25 text-amber-300'
                  : 'bg-white/8 text-white/35'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="checkedIn ? 'bg-amber-400' : 'bg-white/25'"
                />
                {{ checkedIn ? __('Checked In') : __('Checked Out') }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Check In (Navy Blue when active) -->
              <button
                class="h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-30"
                :class="!checkedIn && !attendanceLoading
                  ? 'bg-white text-blue-950'
                  : 'bg-white/8 text-white/30'"
                :disabled="attendanceLoading || attendanceSubmitting || checkedIn"
                @click="doCheckin('IN')"
              >
                <span
                  v-if="attendanceSubmitting && pendingLog === 'IN'"
                  class="inline-block w-4 h-4 border-2 border-blue-950/30 border-t-transparent rounded-full animate-spin"
                />
                <span v-else>{{ __('Check In') }}</span>
              </button>

              <!-- Check Out (Amber when active) -->
              <button
                class="h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-30"
                :class="checkedIn && !attendanceLoading
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/8 text-white/30'"
                :disabled="attendanceLoading || attendanceSubmitting || !checkedIn"
                @click="doCheckin('OUT')"
              >
                <span
                  v-if="attendanceSubmitting && pendingLog === 'OUT'"
                  class="inline-block w-4 h-4 border-2 border-amber-200/40 border-t-white rounded-full animate-spin"
                />
                <span v-else>{{ __('Check Out') }}</span>
              </button>
            </div>

            <p v-if="attendanceError" class="mt-3 text-xs text-center text-red-400">
              {{ attendanceError }}
            </p>
          </div>
        </div>

        <!-- Today's Work Orders -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {{ __("Today's Orders") }}
            </span>
            <button
              class="text-xs font-semibold"
              style="color: #172554;"
              @click="router.push('/tabs/orders')"
            >
              {{ __('View All') }}
            </button>
          </div>

          <div v-if="swoLoading" class="space-y-3">
            <div v-for="n in 3" :key="n" class="animate-pulse rounded-xl bg-white h-16 shadow-sm" />
          </div>

          <div
            v-else-if="todayOrders.length === 0"
            class="rounded-xl bg-white p-5 shadow-sm text-center"
          >
            <svg class="mx-auto mb-2 text-slate-200" width="28" height="28"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p class="text-sm text-slate-400">{{ __('No work orders scheduled for today.') }}</p>
          </div>

          <div v-else class="space-y-2.5">
            <div
              v-for="order in todayOrders"
              :key="order.name"
              class="rounded-xl bg-white p-4 shadow-sm cursor-pointer active:bg-slate-50 transition-colors"
              @click="router.push(`/tabs/orders`)"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="font-bold text-slate-900 text-sm leading-snug">
                  {{ order.work_order_number || order.name }}
                </span>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  :class="statusClass(order.status)"
                >
                  {{ __(order.status) }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                {{ __(order.service_type) }} &middot; {{ order.customer }}
              </p>
            </div>
          </div>
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
          <button
            v-if="pwaInstallPrompt"
            class="w-full h-11 bg-white text-blue-950 rounded-xl font-semibold text-sm active:bg-slate-100"
            @click="installPwa"
          >
            {{ __('Install') }}
          </button>
          <div v-else-if="iosInstallPrompt">
            <button
              v-if="!showIosInstructions"
              class="w-full h-11 bg-white text-blue-950 rounded-xl font-semibold text-sm active:bg-slate-100"
              @click="showIosInstructions = true"
            >
              {{ __('How to Install') }}
            </button>
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
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonContent,
  IonRefresher, IonRefresherContent,
  onIonViewWillEnter,
} from '@ionic/vue'
import { call } from 'frappe-ui'
import { pwaInstallPrompt, iosInstallPrompt } from '@/pwa'
import { session } from '@/data/session'
import { getSWOs, type ServiceWorkOrder } from '@/services/api'

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── Greeting ───────────────────────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return __('Good morning')
  if (h < 18) return __('Good afternoon')
  return __('Good evening')
})

const displayName = computed(() => {
  const u = session.user ?? ''
  return u.includes('@') ? u.split('@')[0] : u
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
)

// ── Attendance ─────────────────────────────────────────────────────────────────
const checkedIn            = ref(false)
const attendanceLoading    = ref(false)
const attendanceSubmitting = ref(false)
const attendanceError      = ref('')
const pendingLog           = ref<'IN' | 'OUT' | ''>('')

async function loadAttendanceStatus() {
  attendanceLoading.value = true
  attendanceError.value   = ''
  try {
    const result = await call('southwest.api.get_attendance_status') as {
      employee:      string | null
      last_log_type: string | null
      checked_in:    boolean
    }
    checkedIn.value = result?.checked_in ?? false
  } catch {
    checkedIn.value = false
  } finally {
    attendanceLoading.value = false
  }
}

async function doCheckin(log_type: 'IN' | 'OUT') {
  if (attendanceSubmitting.value) return
  attendanceSubmitting.value = true
  attendanceError.value      = ''
  pendingLog.value           = log_type
  try {
    await call(
      'hrms.hr.doctype.employee_checkin.employee_checkin.add_log_based_on_employee_field',
      { based_on_field: 'user_id', field_value: session.user, log_type },
    )
    checkedIn.value = log_type === 'IN'
  } catch (err: unknown) {
    const e = err as { messages?: string[]; message?: string }
    attendanceError.value = e?.messages?.[0] ?? e?.message ?? __('Attendance update failed.')
  } finally {
    attendanceSubmitting.value = false
    pendingLog.value           = ''
  }
}

// ── Work Orders ────────────────────────────────────────────────────────────────
const allOrders  = ref<ServiceWorkOrder[]>([])
const swoLoading = ref(false)

const todayOrders = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return allOrders.value.filter((o) => o.scheduled_date === today)
})

async function loadOrders() {
  swoLoading.value = true
  try {
    allOrders.value = await getSWOs()
  } catch {
    allOrders.value = []
  } finally {
    swoLoading.value = false
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(() => {
  loadAttendanceStatus()
  loadOrders()
})

onIonViewWillEnter(() => {
  loadAttendanceStatus()
  loadOrders()
})

async function onRefresh(event: CustomEvent) {
  await Promise.all([loadAttendanceStatus(), loadOrders()])
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
