<template>
  <ion-modal
    :is-open="isOpen"
    :initial-breakpoint="0.68"
    :breakpoints="[0, 0.68, 0.95]"
    handle-behavior="cycle"
    style="--border-radius: 18px 18px 0 0;"
    @didDismiss="emit('close')"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar style="--background: #fff; --min-height: 56px;">
        <ion-title style="font-size: 15px; font-weight: 700; color: #172554;">
          {{ __('Agenda Entry') }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button style="--color: #64748b;" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content style="--background: #f8fafc;">
      <div v-if="loading" class="flex min-h-[45vh] items-center justify-center">
        <ion-spinner name="crescent" />
      </div>
      <div v-else-if="error" class="p-6 text-center text-sm text-red-600">
        {{ error }}
      </div>
      <div v-else-if="detail" class="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-2">
        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <p class="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                {{ __(detail.entry_type) }}
              </p>
              <h3 class="break-words text-lg font-bold leading-6 text-slate-900">
                {{ detail.subject }}
              </h3>
            </div>
            <div class="flex flex-shrink-0 flex-col items-end gap-2">
              <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(detail.status)">
                {{ __(detail.status) }}
              </span>
              <div class="flex items-center gap-1">
                <button
                  class="icon-button"
                  :class="detail.is_subscribed ? 'icon-button-active' : ''"
                  type="button"
                  :aria-label="detail.is_subscribed ? __('Stop Notifications') : __('Notify Me')"
                  :disabled="subscriptionSaving"
                  @click="toggleSubscription"
                >
                  <ion-spinner v-if="subscriptionSaving" name="crescent" class="icon-spinner" />
                  <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span class="text-[11px] font-semibold">
                    {{ detail.is_subscribed ? __('Stop Notifications') : __('Notify Me') }}
                  </span>
                </button>
                <button
                  v-if="detail.can_edit"
                  class="icon-button edit-button"
                  type="button"
                  :aria-label="__('Edit')"
                  @click="emit('edit', detail)"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="detail-row">
            <span class="detail-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div>
              <p class="detail-label">{{ __(scheduleLabel) }}</p>
              <p class="detail-value">{{ formatSchedule(detail) }}</p>
            </div>
          </div>
          <div v-if="detail.entry_type === 'Task'" class="detail-row">
            <span class="detail-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22a10 10 0 1 0-10-10" />
                <path d="m2 12 4 4 8-8" />
              </svg>
            </span>
            <div>
              <p class="detail-label">{{ __('Priority') }}</p>
              <p class="detail-value">{{ __(detail.priority) }}</p>
            </div>
          </div>
          <div v-if="detail.customer" class="detail-row">
            <span class="detail-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <p class="detail-label">{{ __('Customer') }}</p>
              <p class="detail-value">{{ detail.customer }}</p>
            </div>
          </div>
          <div v-if="detail.description" class="detail-row items-start">
            <span class="detail-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
              </svg>
            </span>
            <div class="min-w-0">
              <p class="detail-label">{{ detail.entry_type === 'Task' ? __('Details') : __('Description') }}</p>
              <p class="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{{ detail.description }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <p class="section-label">{{ __('Notifications') }}</p>
          <div class="mb-3">
            <p class="detail-label">{{ __('Subscribers') }}</p>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <span v-for="user in subscribers" :key="user" class="chip">{{ user }}</span>
              <span v-if="!subscribers.length" class="text-sm text-slate-400">—</span>
            </div>
          </div>
          <div>
            <p class="detail-label">{{ __('Alerts') }}</p>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <span v-for="alert in alerts" :key="alert" class="chip alert-chip">{{ alert }}</span>
              <span v-if="!alerts.length" class="text-sm text-slate-400">—</span>
            </div>
          </div>
        </section>

        <p class="px-1 text-xs text-slate-400">
          {{ __('Created By') }}: {{ detail.owner }}
        </p>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import {
  IonButton, IonButtons, IonContent, IonHeader, IonModal, IonSpinner, IonTitle,
  IonToolbar,
} from '@ionic/vue'
import {
  getAgendaEntry, toggleAgendaSubscription, type AgendaEntry,
} from '@/services/api'

const props = defineProps<{
  isOpen: boolean
  entry: AgendaEntry | null
}>()
const emit = defineEmits<{
  close: []
  updated: []
  edit: [entry: AgendaEntry]
}>()

const __ = inject<(text: string) => string>('$translate', (text) => text)
const detail = ref<AgendaEntry | null>(null)
const loading = ref(false)
const subscriptionSaving = ref(false)
const error = ref('')
let loadSequence = 0

const alertOptions = [
  { key: '0:Minutes', label: 'At start time' },
  { key: '30:Minutes', label: '30 minutes before' },
  { key: '1:Hours', label: '1 hour before' },
  { key: '1:Days', label: '1 day before' },
  { key: '7:Days', label: '1 week before' },
]

const scheduleLabel = computed(() => {
  if (detail.value?.entry_type === 'Task') return 'Due Date'
  if (detail.value?.entry_type === 'Reminder') return 'Reminder Date'
  return 'Date & Time'
})
const subscribers = computed(() => (detail.value?.subscribers || [])
  .map((row) => typeof row === 'string' ? row : row.user)
  .filter(Boolean))
const alerts = computed(() => (detail.value?.alerts || []).map((alert) => {
  const key = `${alert.remind_before}:${alert.remind_before_unit}`
  const option = alertOptions.find((item) => item.key === key)
  return option ? __(option.label) : `${alert.remind_before} ${__(alert.remind_before_unit)}`
}))

watch(
  () => [props.isOpen, props.entry?.name] as const,
  async ([isOpen, entryName]) => {
    if (!isOpen || !entryName) return
    const sequence = ++loadSequence
    detail.value = null
    error.value = ''
    loading.value = true
    try {
      const result = await getAgendaEntry(entryName)
      if (sequence === loadSequence && props.isOpen) detail.value = result
    } catch (err: unknown) {
      if (sequence === loadSequence) error.value = errorMessage(err, __('Could not open agenda entry.'))
    } finally {
      if (sequence === loadSequence) loading.value = false
    }
  },
)

async function toggleSubscription() {
  if (!detail.value) return
  subscriptionSaving.value = true
  error.value = ''
  try {
    const entryName = detail.value.name
    await toggleAgendaSubscription(entryName, !detail.value.is_subscribed)
    detail.value = await getAgendaEntry(entryName)
    emit('updated')
  } catch (err: unknown) {
    error.value = errorMessage(err, __('Could not update notifications.'))
  } finally {
    subscriptionSaving.value = false
  }
}

function statusClass(status: AgendaEntry['status']) {
  return status === 'Completed'
    ? 'bg-green-100 text-green-700'
    : status === 'Cancelled'
      ? 'bg-slate-100 text-slate-500'
      : 'bg-amber-100 text-amber-700'
}

function formatSchedule(entry: AgendaEntry) {
  const start = formatDateTime(entry.starts_on, Boolean(entry.all_day))
  if (entry.entry_type !== 'Event' || !entry.ends_on) return start
  return `${start} – ${formatDateTime(entry.ends_on, Boolean(entry.all_day))}`
}

function formatDateTime(value: string, withoutTime: boolean) {
  const date = new Date(value.replace(' ', 'T'))
  const dateText = date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  if (withoutTime) return dateText
  const timeText = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${dateText}, ${timeText}`
}

function errorMessage(err: unknown, fallback: string) {
  const errorValue = err as { _error_message?: string; message?: string }
  return errorValue?._error_message || errorValue?.message || fallback
}
</script>

<style scoped>
.icon-button {
  display: flex;
  min-width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  background: #f8fafc;
  color: #64748b;
  gap: 0.35rem;
  padding: 0 0.625rem;
  white-space: nowrap;
}

.icon-button-active {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #d97706;
}

.edit-button { width: 38px; padding: 0; border-color: #172554; background: #172554; color: #ffffff; }

.icon-button:disabled { opacity: 0.5; }
.icon-spinner { width: 17px; height: 17px; }

.detail-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 0.5rem;
  align-items: center;
  padding: 0.625rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-row:last-child { border-bottom: 0; }
.detail-icon { display: flex; align-items: center; justify-content: center; color: #64748b; }
.detail-label { color: #94a3b8; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.detail-value { color: #334155; font-size: 0.875rem; line-height: 1.25rem; }
.section-label { margin: 0 0 0.5rem; color: #94a3b8; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }

.chip {
  display: inline-flex;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  border-radius: 9999px;
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-chip { border-color: #fde68a; background: #fffbeb; color: #b45309; }
</style>
