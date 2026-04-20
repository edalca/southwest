<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between bg-amber-500 px-4 py-4">
        <h2 class="text-xl font-bold text-slate-900">{{ __('Attendance') }}</h2>
      </div>
    </ion-header>

    <ion-content style="--background: #f1f5f9;">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="pb-28 max-w-lg mx-auto">

        <!-- ── Attendance Calendar ─────────────────────────────────────────── -->
        <div class="px-4 pt-4">
          <p class="text-sm font-bold text-slate-800 mb-3">{{ __('Attendance Calendar') }}</p>

          <div class="bg-white rounded-2xl shadow-sm overflow-hidden">

            <!-- Month navigation -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                @click="prevMonth"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <p class="text-sm font-bold text-slate-800">{{ monthLabel }}</p>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                :class="isCurrentOrFutureMonth ? 'opacity-30 pointer-events-none' : ''"
                @click="nextMonth"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <!-- Day headers -->
            <div class="grid grid-cols-7 px-3 pt-3 pb-1">
              <div v-for="d in DAY_HEADERS" :key="d"
                   class="text-center text-xs font-semibold text-slate-400 py-1">
                {{ d }}
              </div>
            </div>

            <!-- Calendar grid -->
            <div v-if="calLoading" class="flex justify-center items-center py-10">
              <ion-spinner name="crescent" color="medium" />
            </div>
            <div v-else class="grid grid-cols-7 px-3 pb-3 gap-y-1">
              <div v-for="(cell, idx) in calendarCells" :key="idx"
                   class="flex flex-col items-center justify-center py-1">
                <template v-if="cell.day">
                  <div
                    class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold"
                    :class="[
                      cell.isToday ? 'bg-slate-900 text-white' : 'text-slate-700',
                      !cell.isToday && cell.isFuture ? 'text-slate-300' : '',
                    ]"
                  >
                    {{ cell.day }}
                  </div>
                  <div
                    v-if="cell.status"
                    class="w-1.5 h-1.5 rounded-full mt-0.5"
                    :style="{ background: statusColor(cell.status) }"
                  />
                  <div v-else class="w-1.5 h-1.5 mt-0.5" />
                </template>
              </div>
            </div>

            <!-- Legend -->
            <div class="border-t border-slate-100 px-4 py-4 grid grid-cols-4 gap-2">
              <div v-for="item in legendItems" :key="item.label"
                   class="flex flex-col items-center gap-1">
                <div class="flex items-center gap-1">
                  <div class="w-2.5 h-2.5 rounded-full" :style="{ background: item.color }" />
                  <span class="text-[10px] text-slate-500 font-medium">{{ __(item.label) }}</span>
                </div>
                <span class="text-base font-bold text-slate-800 tabular-nums">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Request Attendance ──────────────────────────────────────────── -->
        <div class="px-4 mt-5">
          <ion-button
            expand="block"
            fill="solid"
            style="
              --background: #0f172a;
              --background-activated: #1e293b;
              --border-radius: 14px;
              --padding-top: 16px;
              --padding-bottom: 16px;
              font-weight: 700;
              font-size: 15px;
            "
            @click="openAttendanceRequest"
          >
            {{ __('Request Attendance') }}
          </ion-button>
        </div>

        <!-- ── Recent Attendance Requests ─────────────────────────────────── -->
        <div class="px-4 mt-6">
          <p class="text-sm font-bold text-slate-800 mb-3">{{ __('Recent Attendance Requests') }}</p>

          <div v-if="logsLoading" class="space-y-2">
            <div v-for="n in 2" :key="n" class="animate-pulse bg-white rounded-xl h-14 shadow-sm" />
          </div>

          <div v-else-if="recentLogs.length === 0"
               class="bg-white rounded-2xl shadow-sm px-5 py-8 text-center">
            <p class="text-sm text-slate-400">{{ __('You have no requests') }}</p>
          </div>

          <div v-else class="space-y-2">
            <div v-for="log in recentLogs" :key="log.name"
                 class="bg-white rounded-xl shadow-sm flex items-center gap-4 px-4 py-3">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                :class="log.log_type === 'IN' ? 'bg-emerald-50' : 'bg-slate-100'"
              >
                <svg v-if="log.log_type === 'IN'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-800">
                  {{ log.log_type === 'IN' ? __('Check In') : __('Check Out') }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5">{{ formatLogDate(log.time) }}</p>
              </div>
              <span
                class="text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg flex-shrink-0"
                :class="log.log_type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
              >
                {{ formatShortTime(log.time) }}
              </span>
            </div>
          </div>
        </div>

        <!-- ── Upcoming Shifts ─────────────────────────────────────────────── -->
        <div class="px-4 mt-6 mb-4">
          <p class="text-sm font-bold text-slate-800 mb-3">{{ __('Upcoming Shifts') }}</p>
          <div class="bg-white rounded-2xl shadow-sm px-5 py-8 text-center">
            <p class="text-sm text-slate-400">{{ __('You have no upcoming shifts') }}</p>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonContent,
  IonRefresher, IonRefresherContent,
  IonButton, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  getAttendanceStatus,
  getMonthlyAttendance,
  getTodayCheckinLogs,
  type AttendanceRecord,
  type CheckinLog,
} from '@/services/api'

const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const STATUS_COLORS: Record<string, string> = {
  'Present':  '#22c55e',
  'Half Day': '#eab308',
  'Absent':   '#f43f5e',
  'On Leave': '#60a5fa',
}

// ── Calendar state ─────────────────────────────────────────────────────────────
const today         = new Date()
const currentYear   = ref(today.getFullYear())
const currentMonth  = ref(today.getMonth() + 1)
const calLoading    = ref(false)
const monthAttendance = ref<AttendanceRecord[]>([])

// ── Logs state ─────────────────────────────────────────────────────────────────
const employeeId  = ref<string | null>(null)
const logsLoading = ref(false)
const recentLogs  = ref<CheckinLog[]>([])

// ── Calendar computed ──────────────────────────────────────────────────────────
const monthLabel = computed(() =>
  `${__(MONTH_NAMES[currentMonth.value - 1])} ${currentYear.value}`
)

const isCurrentOrFutureMonth = computed(() => {
  const now = new Date()
  return (
    currentYear.value > now.getFullYear() ||
    (currentYear.value === now.getFullYear() && currentMonth.value >= now.getMonth() + 1)
  )
})

const attendanceMap = computed(() => {
  const map: Record<string, AttendanceRecord> = {}
  for (const r of monthAttendance.value) map[r.attendance_date] = r
  return map
})

interface CalCell {
  day: number | null
  date: string | null
  status: string | null
  isToday: boolean
  isFuture: boolean
}

const calendarCells = computed((): CalCell[] => {
  const yr = currentYear.value
  const mo = currentMonth.value
  const firstWeekday = new Date(yr, mo - 1, 1).getDay()
  const daysInMonth  = new Date(yr, mo, 0).getDate()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const cells: CalCell[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, date: null, status: null, isToday: false, isFuture: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const rec = attendanceMap.value[dateStr]
    cells.push({
      day: d,
      date: dateStr,
      status: rec?.status ?? null,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    })
  }
  return cells
})

const legendItems = computed(() => {
  const counts: Record<string, number> = { Present: 0, 'Half Day': 0, Absent: 0, 'On Leave': 0 }
  for (const r of monthAttendance.value) {
    if (counts[r.status] !== undefined) counts[r.status]++
  }
  return [
    { label: 'Present',  color: STATUS_COLORS['Present'],  count: counts['Present'] },
    { label: 'Half Day', color: STATUS_COLORS['Half Day'], count: counts['Half Day'] },
    { label: 'Absent',   color: STATUS_COLORS['Absent'],   count: counts['Absent'] },
    { label: 'On Leave', color: STATUS_COLORS['On Leave'], count: counts['On Leave'] },
  ]
})

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadEmployeeId() {
  try {
    const result = await getAttendanceStatus()
    employeeId.value = result.employee ?? null
  } catch {
    employeeId.value = null
  }
}

async function loadCalendar() {
  if (!employeeId.value) return
  calLoading.value = true
  try {
    monthAttendance.value = await getMonthlyAttendance(
      employeeId.value, currentYear.value, currentMonth.value,
    )
  } catch {
    monthAttendance.value = []
  } finally {
    calLoading.value = false
  }
}

async function loadLogs() {
  if (!employeeId.value) return
  logsLoading.value = true
  try {
    recentLogs.value = await getTodayCheckinLogs(employeeId.value)
  } catch {
    recentLogs.value = []
  } finally {
    logsLoading.value = false
  }
}

async function loadAll() {
  await loadEmployeeId()
  await Promise.all([loadCalendar(), loadLogs()])
}

// ── Calendar navigation ────────────────────────────────────────────────────────
function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
  loadCalendar()
}

function nextMonth() {
  if (isCurrentOrFutureMonth.value) return
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
  loadCalendar()
}

function openAttendanceRequest() {
  window.open('/hrms/attendance-request', '_blank')
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(loadAll)
onIonViewWillEnter(loadAll)

async function onRefresh(event: CustomEvent) {
  await loadAll()
  ;(event.target as HTMLIonRefresherElement).complete()
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#94a3b8'
}

function formatLogDate(isoTime: string): string {
  if (!isoTime) return ''
  return new Date(isoTime).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatShortTime(isoTime: string): string {
  if (!isoTime) return ''
  return new Date(isoTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
</script>
