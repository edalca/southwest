<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between bg-amber-500 px-4 py-4">
        <h2 class="text-xl font-bold text-slate-900">{{ __('Agenda') }}</h2>
        <ion-button fill="clear" size="small" class="refresh-btn" @click="loadEntries">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </ion-button>
      </div>
    </ion-header>

    <ion-content :scroll-y="false" style="--background: #f8fafc;">
      <div class="agenda-layout mx-auto max-w-lg px-4 pt-4">
        <section class="flex-none rounded-2xl bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <button class="calendar-nav" :aria-label="__('Previous month')" @click="changeMonth(-1)">‹</button>
            <h3 class="text-sm font-bold capitalize text-slate-800">{{ monthTitle }}</h3>
            <button class="calendar-nav" :aria-label="__('Next month')" @click="changeMonth(1)">›</button>
          </div>

          <div class="mb-1 grid grid-cols-7">
            <span v-for="day in weekdayLabels" :key="day" class="py-1 text-center text-[10px] font-bold uppercase text-slate-400">
              {{ day }}
            </span>
          </div>

          <div class="grid grid-cols-7 gap-y-1">
            <div
              v-for="cell in calendarCells"
              :key="cell.key"
              class="calendar-day"
              :class="{
                'text-slate-300': !cell.inMonth,
                'calendar-day-today': cell.isToday,
              }"
            >
              <span>{{ cell.day }}</span>
              <span class="flex h-1.5 items-center justify-center gap-0.5">
                <i
                  v-for="entry in cell.entries.slice(0, 3)"
                  :key="entry.name"
                  class="h-1 w-1 rounded-full"
                  :class="entryDotClass(entry)"
                />
              </span>
            </div>
          </div>
        </section>

        <ion-segment v-model="scope" mode="ios" class="agenda-scope-segment flex-none">
          <ion-segment-button value="following">
            <ion-label class="text-[11px] font-bold">{{ __('FOLLOWING') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="all">
            <ion-label class="text-[11px] font-bold">{{ __('ALL') }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <section class="flex min-h-0 flex-1 flex-col">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-widest text-slate-400 capitalize">
              {{ monthTitle }}
            </p>
            <span class="text-xs text-slate-400">{{ monthEntries.length }}</span>
          </div>

          <div class="agenda-items-scroll">
            <div v-if="loading" class="space-y-2">
              <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-xl bg-white shadow-sm" />
            </div>

            <div v-else-if="error" class="rounded-xl bg-white p-6 text-center shadow-sm">
              <p class="text-sm text-red-500">{{ error }}</p>
              <ion-button fill="clear" size="small" @click="loadEntries">{{ __('Retry') }}</ion-button>
            </div>

            <div v-else-if="monthEntries.length === 0" class="rounded-xl bg-white p-7 text-center shadow-sm">
              <svg class="mx-auto mb-3 text-slate-200" width="40" height="40" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p class="text-sm text-slate-400">{{ __('No agenda entries for this month.') }}</p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="entry in monthEntries"
                :key="entry.name"
                class="w-full cursor-pointer rounded-xl bg-white p-4 text-left shadow-sm"
                role="button"
                tabindex="0"
                @click="openViewer(entry)"
                @keyup.enter.self="openViewer(entry)"
              >
                <div class="flex items-start gap-3">
                  <span class="mt-1 h-9 w-1 rounded-full" :class="entryBarClass(entry)" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <p class="truncate text-sm font-bold text-slate-800">{{ entry.subject }}</p>
                      <svg v-if="entry.is_subscribed" width="14" height="14" viewBox="0 0 24 24" fill="none"
                           stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <p class="mt-1 text-xs text-slate-400">
                      {{ __(entry.entry_type) }} · {{ formatEntryTime(entry) }}
                    </p>
                    <p v-if="entry.customer" class="mt-1 truncate text-xs text-slate-500">
                      {{ entry.customer }}
                    </p>
                  </div>
                  <div class="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(displayStatus(entry))">
                      {{ __(displayStatus(entry)) }}
                    </span>
                    <button
                      v-if="entry.can_edit"
                      class="agenda-card-edit"
                      type="button"
                      :aria-label="__('Edit')"
                      @click.stop="openEditor(entry)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="mb-20">
        <ion-fab-button color="dark" @click="openEditor()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </ion-fab-button>
      </ion-fab>

      <ion-modal
        :is-open="viewerOpen"
        :initial-breakpoint="0.68"
        :breakpoints="[0, 0.68, 0.95]"
        handle-behavior="cycle"
        style="--border-radius: 18px 18px 0 0;"
        @didDismiss="closeViewer"
      >
        <ion-header class="ion-no-border">
          <ion-toolbar style="--background: #fff; --min-height: 56px;">
            <ion-title style="font-size: 15px; font-weight: 700; color: #172554;">
              {{ __('Agenda Entry') }}
            </ion-title>
            <ion-buttons slot="end">
              <ion-button style="--color: #64748b;" @click="closeViewer">
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
          <div v-if="viewerLoading" class="flex min-h-[45vh] items-center justify-center">
            <ion-spinner name="crescent" />
          </div>
          <div v-else-if="viewerError" class="p-6 text-center text-sm text-red-600">
            {{ viewerError }}
          </div>
          <div v-else-if="viewerEntry" class="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-2">
            <section class="rounded-2xl bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {{ __(viewerEntry.entry_type) }}
                  </p>
                  <h3 class="break-words text-lg font-bold leading-6 text-slate-900">
                    {{ viewerEntry.subject }}
                  </h3>
                </div>
                <div class="flex flex-shrink-0 flex-col items-end gap-2">
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(displayStatus(viewerEntry))">
                    {{ __(displayStatus(viewerEntry)) }}
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      class="viewer-icon-button"
                      :class="viewerEntry.is_subscribed ? 'viewer-icon-button-active' : ''"
                      type="button"
                      :aria-label="viewerEntry.can_edit ? __('Notifications Enabled') : viewerEntry.is_subscribed ? __('Stop Notifications') : __('Notify Me')"
                      :disabled="viewerSubscriptionSaving || viewerEntry.can_edit"
                      @click="toggleViewerSubscription"
                    >
                      <ion-spinner v-if="viewerSubscriptionSaving" name="crescent" class="viewer-icon-spinner" />
                      <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <span class="text-[11px] font-semibold">
                        {{ viewerEntry.can_edit ? __('Notifications Enabled') : viewerEntry.is_subscribed ? __('Stop Notifications') : __('Notify Me') }}
                      </span>
                    </button>
                    <button
                      v-if="viewerEntry.can_edit"
                      class="viewer-icon-button viewer-edit-button"
                      type="button"
                      :aria-label="__('Edit')"
                      @click="editFromViewer"
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
              <div class="viewer-detail-row">
                <span class="viewer-detail-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <p class="viewer-detail-label">{{ __(viewerScheduleLabel) }}</p>
                  <p class="viewer-detail-value">{{ formatViewerSchedule(viewerEntry) }}</p>
                </div>
              </div>
              <div v-if="viewerEntry.entry_type === 'Task'" class="viewer-detail-row">
                <span class="viewer-detail-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22a10 10 0 1 0-10-10" />
                    <path d="m2 12 4 4 8-8" />
                  </svg>
                </span>
                <div>
                  <p class="viewer-detail-label">{{ __('Priority') }}</p>
                  <p class="viewer-detail-value">{{ __(viewerEntry.priority) }}</p>
                </div>
              </div>
              <div v-if="viewerEntry.customer" class="viewer-detail-row">
                <span class="viewer-detail-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <div>
                  <p class="viewer-detail-label">{{ __('Customer') }}</p>
                  <p class="viewer-detail-value">{{ viewerEntry.customer }}</p>
                </div>
              </div>
              <div v-if="viewerEntry.description" class="viewer-detail-row items-start">
                <span class="viewer-detail-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="viewer-detail-label">{{ viewerEntry.entry_type === 'Task' ? __('Details') : __('Description') }}</p>
                  <p class="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">{{ viewerEntry.description }}</p>
                </div>
              </div>
            </section>

            <section class="rounded-2xl bg-white p-4 shadow-sm">
              <p class="section-label">{{ __('Notifications') }}</p>
              <div class="mb-3">
                <p class="viewer-detail-label">{{ __('Subscribers') }}</p>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  <span v-for="user in viewerSubscribers" :key="user" class="viewer-chip">{{ user }}</span>
                  <span v-if="!viewerSubscribers.length" class="text-sm text-slate-400">—</span>
                </div>
              </div>
              <div>
                <p class="viewer-detail-label">{{ __('Alerts') }}</p>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  <span v-for="alert in viewerAlerts" :key="alert" class="viewer-chip viewer-alert-chip">{{ alert }}</span>
                  <span v-if="!viewerAlerts.length" class="text-sm text-slate-400">—</span>
                </div>
              </div>
            </section>

            <p class="px-1 text-xs text-slate-400">
              {{ __('Created By') }}: {{ viewerEntry.owner }}
            </p>
          </div>
        </ion-content>
      </ion-modal>

      <ion-modal
        :is-open="editorOpen"
        style="--width: 100%; --height: 100%; --max-width: 100%; --max-height: 100%; --border-radius: 0;"
        @didDismiss="closeEditor"
      >
        <ion-header class="ion-no-border">
          <ion-toolbar style="--background: #172554; --color: #fff; --min-height: 56px;">
            <ion-title style="font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em;">
              {{ editingName ? __('Agenda Entry') : __('New Agenda Entry') }}
            </ion-title>
            <ion-buttons slot="end">
              <ion-button style="--color: rgba(255,255,255,0.65);" @click="closeEditor">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>

          <div v-if="editingName" class="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5">
            <span class="mr-2 truncate text-xs text-slate-500">
              {{ __(form.entry_type) }}<template v-if="form.customer"> · {{ form.customer }}</template>
            </span>
            <span class="flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="statusClass(form.status)">
              {{ __(form.status) }}
            </span>
          </div>
        </ion-header>

        <ion-content style="--background: #f8fafc;">
          <div class="mx-auto max-w-lg space-y-5 px-4 py-5 pb-10">
            <section>
              <p class="section-label">{{ __('Basic Information') }}</p>
              <ion-segment v-model="form.entry_type" mode="ios" class="entry-type-segment" :disabled="!canEdit">
                <ion-segment-button value="Event">
                  <ion-label>{{ __('Event') }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="Task">
                  <ion-label>{{ __('Task') }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="Reminder">
                  <ion-label>{{ __('Reminder') }}</ion-label>
                </ion-segment-button>
              </ion-segment>
              <p class="entry-type-help">{{ __(entryTypeHelp) }}</p>
              <ion-item class="custom-ion-item">
                <ion-input v-model="form.subject" :label="__('Subject') + ' *'" label-placement="stacked" :readonly="!canEdit" />
              </ion-item>
              <div
                v-if="editingName || form.entry_type === 'Task'"
                class="grid gap-2"
                :class="editingName && form.entry_type === 'Task' ? 'grid-cols-2' : 'grid-cols-1'"
              >
                <ion-item v-if="editingName" class="custom-ion-item">
                  <ion-select v-model="form.status" :label="__('Status')" label-placement="stacked" interface="action-sheet" :disabled="!canEdit">
                    <ion-select-option value="Open">{{ __('Open') }}</ion-select-option>
                    <ion-select-option value="Completed">{{ __('Completed') }}</ion-select-option>
                    <ion-select-option value="Cancelled">{{ __('Cancelled') }}</ion-select-option>
                  </ion-select>
                </ion-item>
                <ion-item v-if="form.entry_type === 'Task'" class="custom-ion-item">
                  <ion-select v-model="form.priority" :label="__('Priority')" label-placement="stacked" interface="action-sheet" :disabled="!canEdit">
                    <ion-select-option value="Low">{{ __('Low') }}</ion-select-option>
                    <ion-select-option value="Medium">{{ __('Medium') }}</ion-select-option>
                    <ion-select-option value="High">{{ __('High') }}</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>
            </section>

            <section>
              <p class="section-label">{{ __(scheduleSectionLabel) }}</p>
              <div class="grid grid-cols-2 gap-2">
                <ion-item class="custom-ion-item">
                  <ion-input v-model="form.start_date" type="date" :label="__(startDateLabel) + ' *'" label-placement="stacked" :readonly="!canEdit" />
                </ion-item>
                <ion-item v-if="!form.all_day" class="custom-ion-item">
                  <ion-input v-model="form.start_time" type="time" :label="__(startTimeLabel)" label-placement="stacked" :readonly="!canEdit" />
                </ion-item>
              </div>
              <ion-item class="custom-ion-item" lines="none">
                <ion-toggle v-model="form.all_day" justify="space-between" :disabled="!canEdit">
                  {{ __(noTimeLabel) }}
                </ion-toggle>
              </ion-item>
              <div v-if="form.entry_type === 'Event'" class="grid grid-cols-2 gap-2">
                <ion-item class="custom-ion-item">
                  <ion-input v-model="form.end_date" type="date" :label="__('End Date')" label-placement="stacked" :readonly="!canEdit" />
                </ion-item>
                <ion-item v-if="form.end_date && !form.all_day" class="custom-ion-item">
                  <ion-input v-model="form.end_time" type="time" :label="__('End Time')" label-placement="stacked" :readonly="!canEdit" />
                </ion-item>
              </div>
            </section>

            <section>
              <p class="section-label">{{ __('Related Context') }}</p>
              <ion-item class="custom-ion-item">
                <ion-select v-model="form.customer" :label="__('Customer')" label-placement="stacked" interface="action-sheet" :disabled="!canEdit">
                  <ion-select-option value="">{{ __('None') }}</ion-select-option>
                  <ion-select-option v-for="customer in customers" :key="customer.name" :value="customer.name">
                    {{ customer.customer_name || customer.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item class="custom-ion-item">
                <ion-textarea v-model="form.description" :label="__(descriptionLabel)" label-placement="stacked" :readonly="!canEdit" :auto-grow="true" />
              </ion-item>
            </section>

            <section>
              <p class="section-label">{{ __('Notification Settings') }}</p>
              <ion-item class="custom-ion-item">
                <ion-select
                  v-model="form.subscriber_users"
                  :label="__('Subscribers')"
                  label-placement="stacked"
                  :multiple="true"
                  :disabled="!canEdit"
                >
                  <ion-select-option
                    v-for="user in agendaUsers"
                    :key="user.name"
                    :value="user.name"
                    :disabled="user.name === entryOwner"
                  >
                    {{ user.full_name || user.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item class="custom-ion-item">
                <ion-select
                  v-model="form.alert_keys"
                  :label="__('Alerts')"
                  label-placement="stacked"
                  :multiple="true"
                  :disabled="!canEdit"
                >
                  <ion-select-option
                    v-for="option in alertOptions"
                    :key="option.key"
                    :value="option.key"
                    :disabled="!isAlertOptionAvailable(option.key) && !isHistoricalAlertAllowed(option.key) && !form.alert_keys.includes(option.key)"
                  >
                    {{ __(option.label) }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <p class="mt-1 px-1 text-xs text-slate-400">
                {{ __('Only alerts that can still be sent are available.') }}
              </p>
            </section>

            <div v-if="!canEdit" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {{ __('This agenda entry is read-only.') }}
            </div>
          </div>
        </ion-content>

        <ion-footer class="ion-no-border">
          <div class="mx-auto max-w-lg space-y-2 border-t border-slate-100 bg-white px-4 py-3">
            <button
              v-if="canEdit"
              class="primary-action"
              :disabled="saving"
              :style="saving ? 'opacity:.5;cursor:not-allowed;' : ''"
              @click="saveEntry"
            >
              <span v-if="saving" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span v-else>{{ editingName ? __('Save') : __('Create Agenda Entry') }}</span>
            </button>
            <button
              v-if="editingName"
              class="notification-action"
              :class="form.is_subscribed ? 'notification-action-active' : ''"
              :disabled="subscriptionSaving || canEdit"
              :style="subscriptionSaving || canEdit ? 'opacity:.5;cursor:not-allowed;' : ''"
              @click="toggleSubscription"
            >
              <ion-spinner v-if="subscriptionSaving" name="crescent" class="notification-spinner" />
              <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {{ canEdit ? __('Notifications Enabled') : form.is_subscribed ? __('Stop Notifications') : __('Notify Me') }}
            </button>
          </div>
        </ion-footer>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonFooter, IonHeader,
  IonInput, IonItem, IonLabel, IonModal, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonSpinner, IonTextarea, IonTitle, IonToggle, IonToolbar, alertController, onIonViewWillEnter,
} from '@ionic/vue'
import { session } from '@/data/session'
import { userErrorMessage as errorMessage } from '@/utils/errors'
import {
  createAgendaEntry, getAgendaEntries, getAgendaEntry, getAgendaUsers,
  getCustomers, toggleAgendaSubscription, updateAgendaEntry,
  type AgendaAlert, type AgendaEntry, type AgendaSubscriber, type AgendaUser,
  type Customer,
} from '@/services/api'

const __ = inject<(text: string) => string>('$translate', (text) => text)
const route = useRoute()
const router = useRouter()

type Scope = 'all' | 'following'
type FormState = {
  subject: string
  entry_type: AgendaEntry['entry_type']
  status: AgendaEntry['status']
  priority: AgendaEntry['priority']
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  all_day: boolean
  customer: string
  description: string
  subscriber_users: string[]
  alert_keys: string[]
  is_subscribed: boolean
}

const scope = ref<Scope>('following')
const entries = ref<AgendaEntry[]>([])
const loading = ref(false)
const error = ref('')
const currentTime = ref(Date.now())
const visibleMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
let clockInterval: number | undefined

const editorOpen = ref(false)
const editingName = ref<string | null>(null)
const entryOwner = ref(session.user || '')
const canEdit = ref(true)
const saving = ref(false)
const subscriptionSaving = ref(false)
const originalSubscribers = ref<AgendaSubscriber[]>([])
const originalAlerts = ref<AgendaAlert[]>([])
const originalStartsOn = ref('')

const viewerOpen = ref(false)
const viewerLoading = ref(false)
const viewerSubscriptionSaving = ref(false)
const viewerError = ref('')
const viewerEntry = ref<AgendaEntry | null>(null)
const pendingViewerEdit = ref<AgendaEntry | null>(null)

const customers = ref<Customer[]>([])
const agendaUsers = ref<AgendaUser[]>([])

const form = reactive<FormState>(blankForm())

const alertOptions = [
  { key: '0:Minutes', label: 'At start time' },
  { key: '30:Minutes', label: '30 minutes before' },
  { key: '1:Hours', label: '1 hour before' },
  { key: '1:Days', label: '1 day before' },
  { key: '7:Days', label: '1 week before' },
]

const viewerScheduleLabel = computed(() => {
  if (viewerEntry.value?.entry_type === 'Task') return 'Due Date'
  if (viewerEntry.value?.entry_type === 'Reminder') return 'Reminder Date'
  return 'Date & Time'
})
const viewerSubscribers = computed(() => {
  const subscribers = viewerEntry.value?.subscribers || []
  return subscribers
    .map((row) => typeof row === 'string' ? row : row.user)
    .filter(Boolean)
})
const viewerAlerts = computed(() => {
  return (viewerEntry.value?.alerts || []).map((alert) => {
    const key = `${alert.remind_before}:${alert.remind_before_unit}`
    const option = alertOptions.find((item) => item.key === key)
    return option ? __(option.label) : `${alert.remind_before} ${__(alert.remind_before_unit)}`
  })
})

const filteredEntries = computed(() =>
  scope.value === 'following'
    ? entries.value.filter(
        (entry) => (entry.owner === session.user || entry.is_subscribed) && isEntryActive(entry),
      )
    : entries.value,
)

const monthTitle = computed(() => visibleMonth.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))
const weekdayLabels = computed(() => {
  const sunday = new Date(2026, 0, 4)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
    return date.toLocaleDateString(undefined, { weekday: 'narrow' })
  })
})

const calendarCells = computed(() => {
  const first = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const key = dateKey(date)
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === visibleMonth.value.getMonth(),
      isToday: key === dateKey(new Date()),
      entries: entries.value.filter((entry) => serverDateKey(entry.starts_on) === key),
    }
  })
})

const monthEntries = computed(() => {
  const rows = [...filteredEntries.value]
  if (scope.value === 'following') {
    return rows.sort((first, second) => entryStartTimestamp(first) - entryStartTimestamp(second))
  }
  return rows.sort((first, second) => {
    const activeOrder = Number(isEntryActive(second)) - Number(isEntryActive(first))
    if (activeOrder !== 0) return activeOrder
    return entryStartTimestamp(second) - entryStartTimestamp(first)
  })
})

const entryTypeHelp = computed(() => {
  if (form.entry_type === 'Event') return 'Schedule a block of time with a beginning and an end.'
  if (form.entry_type === 'Task') return 'Add a to-do with a due date, priority, and completion status.'
  return 'Receive a notice at a specific date and time.'
})
const scheduleSectionLabel = computed(() =>
  form.entry_type === 'Event' ? 'Date & Time' : form.entry_type === 'Task' ? 'Due Date' : 'Reminder Date',
)
const startDateLabel = computed(() =>
  form.entry_type === 'Event' ? 'Start Date' : form.entry_type === 'Task' ? 'Due Date' : 'Reminder Date',
)
const startTimeLabel = computed(() =>
  form.entry_type === 'Event' ? 'Start Time' : form.entry_type === 'Task' ? 'Due Time' : 'Reminder Time',
)
const noTimeLabel = computed(() => form.entry_type === 'Event' ? 'All Day' : 'No Specific Time')
const descriptionLabel = computed(() => form.entry_type === 'Task' ? 'Details' : 'Description')

function blankForm(): FormState {
  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() + 1)
  defaultStart.setSeconds(0, 0)
  const defaultEnd = new Date(defaultStart)
  defaultEnd.setHours(defaultEnd.getHours() + 1)
  const subscriberUsers = agendaUsers.value.map((user) => user.name)
  if (session.user && !subscriberUsers.includes(session.user)) subscriberUsers.unshift(session.user)
  return {
    subject: '', entry_type: 'Event', status: 'Open', priority: 'Medium',
    start_date: dateKey(defaultStart), start_time: timeKey(defaultStart),
    end_date: dateKey(defaultEnd), end_time: timeKey(defaultEnd), all_day: false,
    customer: '', description: '',
    subscriber_users: subscriberUsers,
    alert_keys: ['0:Minutes'], is_subscribed: true,
  }
}

function alertKey(alert: AgendaAlert) {
  return `${alert.remind_before}:${alert.remind_before_unit}`
}

function isAlertOptionAvailable(key: string) {
  if (!form.start_date) return false
  const [amountText, unit] = key.split(':')
  const unitMinutes: Record<string, number> = { Minutes: 1, Hours: 60, Days: 1440 }
  const amount = Number(amountText)
  const start = new Date(
    serverDateTime(form.start_date, form.all_day ? '09:00' : form.start_time).replace(' ', 'T'),
  )
  const alertTime = start.getTime() - amount * (unitMinutes[unit] || 0) * 60_000
  return Number.isFinite(alertTime) && alertTime >= currentTime.value - 60_000
}

function isHistoricalAlertAllowed(key: string) {
  if (!editingName.value || !originalAlerts.value.some((alert) => alertKey(alert) === key)) return false
  const currentStartsOn = serverDateTime(form.start_date, form.all_day ? '09:00' : form.start_time)
  return currentStartsOn.replace('T', ' ').slice(0, 16) === originalStartsOn.value.replace('T', ' ').slice(0, 16)
}

async function loadEntries() {
  loading.value = true
  error.value = ''
  try {
    const start = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth(), 1)
    const end = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + 1, 1)
    entries.value = await getAgendaEntries(`${dateKey(start)} 00:00:00`, `${dateKey(end)} 00:00:00`)
  } catch (err: unknown) {
    error.value = errorMessage(err, __('Could not load agenda.'))
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  const [customerResult, userResult] = await Promise.allSettled([getCustomers(), getAgendaUsers()])
  if (customerResult.status === 'fulfilled') customers.value = customerResult.value
  if (userResult.status === 'fulfilled') agendaUsers.value = userResult.value
}

async function openViewer(entry: AgendaEntry) {
  viewerEntry.value = entry
  viewerError.value = ''
  viewerLoading.value = true
  viewerOpen.value = true
  try {
    viewerEntry.value = await getAgendaEntry(entry.name)
  } catch (err: unknown) {
    viewerError.value = errorMessage(err, __('Could not open agenda entry.'))
  } finally {
    viewerLoading.value = false
  }
}

function closeViewer() {
  viewerOpen.value = false
  viewerLoading.value = false
  viewerError.value = ''
  viewerEntry.value = null
  if (pendingViewerEdit.value) {
    const entry = pendingViewerEdit.value
    pendingViewerEdit.value = null
    openEditor(entry)
  }
}

function editFromViewer() {
  if (!viewerEntry.value?.can_edit) return
  pendingViewerEdit.value = viewerEntry.value
  viewerOpen.value = false
}

async function toggleViewerSubscription() {
  if (!viewerEntry.value || viewerEntry.value.can_edit) return
  const entryName = viewerEntry.value.name
  const subscribe = !viewerEntry.value.is_subscribed
  viewerSubscriptionSaving.value = true
  viewerError.value = ''
  try {
    await toggleAgendaSubscription(entryName, subscribe)
    viewerEntry.value = await getAgendaEntry(entryName)
    await loadEntries()
  } catch (err: unknown) {
    viewerError.value = errorMessage(err, __('Could not update notifications.'))
  } finally {
    viewerSubscriptionSaving.value = false
  }
}

function changeMonth(offset: number) {
  visibleMonth.value = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + offset, 1)
  loadEntries()
}

async function openEditor(entry?: Pick<AgendaEntry, 'name'>) {
  if (!entry) {
    await loadOptions()
    editingName.value = null
    entryOwner.value = session.user || ''
    canEdit.value = true
    originalSubscribers.value = []
    originalAlerts.value = []
    originalStartsOn.value = ''
    Object.assign(form, blankForm())
    editorOpen.value = true
    return
  }

  try {
    const detail = await getAgendaEntry(entry.name)
    editingName.value = detail.name
    entryOwner.value = detail.owner
    canEdit.value = detail.can_edit !== false
    const subscribers = (detail.subscribers || []) as AgendaSubscriber[]
    originalSubscribers.value = subscribers
    originalAlerts.value = detail.alerts || []
    originalStartsOn.value = detail.starts_on
    const start = splitServerDateTime(detail.starts_on)
    const end = detail.ends_on ? splitServerDateTime(detail.ends_on) : { date: '', time: '' }
    Object.assign(form, {
      subject: detail.subject,
      entry_type: detail.entry_type,
      status: detail.status,
      priority: detail.priority,
      start_date: start.date,
      start_time: start.time,
      end_date: end.date,
      end_time: end.time,
      all_day: Boolean(detail.all_day),
      customer: detail.customer || '',
      description: detail.description || '',
      subscriber_users: subscribers.map((row) => row.user),
      alert_keys: (detail.alerts || []).map((row) => `${row.remind_before}:${row.remind_before_unit}`),
      is_subscribed: detail.is_subscribed,
    })
    editorOpen.value = true
  } catch (err: unknown) {
    await presentAgendaDialog(errorMessage(err, __('Could not open agenda entry.')))
  }
}

function closeEditor() {
  editorOpen.value = false
  editingName.value = null
}

async function saveEntry() {
  if (!form.subject.trim() || !form.start_date) {
    await presentAgendaDialog(__('Subject and date are required.'))
    return
  }
  const startsOn = serverDateTime(form.start_date, form.all_day ? '09:00' : form.start_time)
  const endsOn = form.entry_type === 'Event' && form.end_date
    ? serverDateTime(form.end_date, form.all_day ? '17:00' : form.end_time)
    : null
  if (endsOn && new Date(endsOn.replace(' ', 'T')) < new Date(startsOn.replace(' ', 'T'))) {
    await presentAgendaDialog(__('Ends On cannot be before Starts On.'))
    return
  }
  const invalidAlert = form.alert_keys.find(
    (key) => !isAlertOptionAvailable(key) && !isHistoricalAlertAllowed(key),
  )
  if (invalidAlert) {
    await presentAgendaDialog(__('An alert cannot be scheduled in the past. Choose a shorter notice period.'))
    return
  }
  saving.value = true
  try {
    const isEvent = form.entry_type === 'Event'
    const requiredOwner = entryOwner.value || session.user || ''
    const subscriberUsers = Array.from(new Set([
      ...form.subscriber_users,
      requiredOwner,
    ].filter((user): user is string => Boolean(user))))
    const payload: Record<string, unknown> = {
      subject: form.subject.trim(),
      entry_type: form.entry_type,
      status: form.status,
      priority: form.priority,
      starts_on: startsOn,
      ends_on: isEvent ? endsOn : null,
      all_day: form.all_day ? 1 : 0,
      customer: form.customer || null,
      description: form.description,
      subscribers: (!editingName.value && agendaUsers.value.length === 0 ? [] : subscriberUsers).map((user) => {
        const existing = originalSubscribers.value.find((row) => row.user === user)
        return existing?.name ? { name: existing.name, user } : { user }
      }),
      alerts: form.alert_keys.map((key) => {
        const [amount, unit] = key.split(':') as [string, AgendaAlert['remind_before_unit']]
        const existing = originalAlerts.value.find(
          (row) => Number(row.remind_before) === Number(amount) && row.remind_before_unit === unit,
        )
        return existing?.name
          ? { name: existing.name, remind_before: Number(amount), remind_before_unit: unit }
          : { remind_before: Number(amount), remind_before_unit: unit }
      }),
    }
    if (editingName.value) await updateAgendaEntry(editingName.value, payload)
    else await createAgendaEntry(payload)
    closeEditor()
    await loadEntries()
  } catch (err: unknown) {
    await presentAgendaDialog(errorMessage(err, __('Could not save agenda entry.')))
  } finally {
    saving.value = false
  }
}

async function toggleSubscription() {
  if (!editingName.value || canEdit.value) return
  subscriptionSaving.value = true
  try {
    form.is_subscribed = await toggleAgendaSubscription(editingName.value, !form.is_subscribed)
    if (session.user) {
      if (form.is_subscribed && !form.subscriber_users.includes(session.user)) {
        form.subscriber_users.push(session.user)
      } else if (!form.is_subscribed) {
        form.subscriber_users = form.subscriber_users.filter((user) => user !== session.user)
      }
    }
    await loadEntries()
  } catch (err: unknown) {
    await presentAgendaDialog(errorMessage(err, __('Could not update notifications.')))
  } finally {
    subscriptionSaving.value = false
  }
}

watch(() => form.entry_type, (entryType) => {
  if (entryType !== 'Event') {
    form.end_date = ''
    form.end_time = ''
  }
})

function entryDotClass(entry: AgendaEntry) {
  if (entry.status === 'Completed') return 'bg-green-500'
  if (entry.status === 'Cancelled') return 'bg-slate-400'
  if (!isEntryActive(entry)) return 'bg-slate-300'
  return entry.entry_type === 'Event' ? 'bg-blue-500' : entry.entry_type === 'Task' ? 'bg-orange-500' : 'bg-purple-500'
}

function entryBarClass(entry: AgendaEntry) {
  return entryDotClass(entry)
}

function displayStatus(entry: AgendaEntry): AgendaEntry['status'] | 'Finished' {
  if (entry.status !== 'Open') return entry.status
  return isEntryActive(entry) ? 'Open' : 'Finished'
}

function isEntryActive(entry: AgendaEntry) {
  if (entry.status !== 'Open') return false
  const endValue = entry.entry_type === 'Event' && entry.ends_on ? entry.ends_on : entry.starts_on
  if (entry.all_day) {
    const endOfEntryDay = localDate(serverDateKey(endValue))
    endOfEntryDay.setDate(endOfEntryDay.getDate() + 1)
    return endOfEntryDay.getTime() > currentTime.value
  }
  return new Date(endValue.replace(' ', 'T')).getTime() > currentTime.value
}

function entryStartTimestamp(entry: AgendaEntry) {
  return new Date(entry.starts_on.replace(' ', 'T')).getTime()
}

function statusClass(status: AgendaEntry['status'] | 'Finished') {
  return status === 'Completed'
    ? 'bg-green-100 text-green-700'
    : status === 'Cancelled' || status === 'Finished'
      ? 'bg-slate-100 text-slate-500'
      : 'bg-amber-100 text-amber-700'
}

function formatEntryTime(entry: AgendaEntry) {
  const date = new Date(entry.starts_on.replace(' ', 'T'))
  const dateText = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  if (entry.all_day) {
    const timeText = entry.entry_type === 'Event' ? __('All Day') : __('No Specific Time')
    return `${dateText} · ${timeText}`
  }
  const timeText = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${dateText} · ${timeText}`
}

function formatViewerSchedule(entry: AgendaEntry) {
  const start = formatViewerDateTime(entry.starts_on, Boolean(entry.all_day))
  if (entry.entry_type !== 'Event' || !entry.ends_on) return start
  return `${start} – ${formatViewerDateTime(entry.ends_on, Boolean(entry.all_day))}`
}

function formatViewerDateTime(value: string, withoutTime: boolean) {
  const date = new Date(value.replace(' ', 'T'))
  const dateText = date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  if (withoutTime) return dateText
  const timeText = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${dateText}, ${timeText}`
}

function localDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function serverDateKey(value: string) {
  return value.slice(0, 10)
}

function splitServerDateTime(value: string) {
  const normalized = value.replace('T', ' ')
  const [date, rawTime = '09:00:00'] = normalized.split(' ')
  return { date, time: rawTime.slice(0, 5) }
}

function serverDateTime(date: string, time: string) {
  return `${date} ${time || '09:00'}:00`
}

async function presentAgendaDialog(message: string) {
  const alert = await alertController.create({
    header: __('Check the information'),
    message,
    buttons: [__('OK')],
  })
  await alert.present()
}

onMounted(() => {
  loadOptions()
  clockInterval = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 60_000)
})
onUnmounted(() => {
  if (clockInterval) window.clearInterval(clockInterval)
})
onIonViewWillEnter(() => {
  loadEntries()
  const requestedEntry = route.query.edit
  if (typeof requestedEntry === 'string') {
    openEditor({ name: requestedEntry })
    const query = { ...route.query }
    delete query.edit
    router.replace({ query })
  }
})
</script>

<style scoped>
.refresh-btn {
  --color: #334155;
  --background: transparent;
  margin: 0;
}

.agenda-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.agenda-items-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding-bottom: 7rem;
  -webkit-overflow-scrolling: touch;
}

.calendar-nav {
  display: flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: #64748b;
  font-size: 1.5rem;
}

.calendar-day {
  display: flex;
  min-height: 2.75rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: #475569;
}

.calendar-day-today {
  background: #fef3c7;
  color: #b45309 !important;
  font-weight: 700;
}

.agenda-scope-segment {
  padding: 0.2rem;
  border-radius: 0.875rem;
  background: #e2e8f0;
}

.agenda-card-edit {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  background: #f8fafc;
  color: #172554;
}

.viewer-icon-button {
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

.viewer-icon-button-active {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #d97706;
}

.viewer-edit-button {
  width: 38px;
  padding: 0;
  border-color: #172554;
  background: #172554;
  color: #ffffff;
}

.viewer-icon-button:disabled {
  opacity: 0.5;
}

.viewer-icon-spinner {
  width: 17px;
  height: 17px;
}

.viewer-detail-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 0.5rem;
  align-items: center;
  padding: 0.625rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.viewer-detail-row:last-child {
  border-bottom: 0;
}

.viewer-detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.viewer-detail-label {
  color: #94a3b8;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.viewer-detail-value {
  color: #334155;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.viewer-chip {
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

.viewer-alert-chip {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.section-label {
  margin: 0 0 0.5rem 0.25rem;
  color: #94a3b8;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.entry-type-segment {
  --background: #e2e8f0;
  margin-bottom: 0.5rem;
  padding: 3px;
}

.entry-type-segment ion-segment-button {
  --color: #64748b;
  --color-checked: #172554;
  --indicator-color: #ffffff;
  min-height: 40px;
  font-size: 0.75rem;
  font-weight: 700;
}

.entry-type-help {
  min-height: 2rem;
  margin: 0 0.25rem 0.75rem;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1rem;
}

.custom-ion-item {
  --background: #ffffff;
  --border-color: #e2e8f0;
  --border-radius: 12px;
  --inner-padding-end: 12px;
  --padding-start: 12px;
  margin-bottom: 8px;
}

.primary-action {
  width: 100%;
  border-radius: 8px;
  background: #172554;
  box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  padding: 14px;
  transition: opacity 0.15s;
}

.notification-action {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1.5px solid #f59e0b;
  border-radius: 8px;
  background: #ffffff;
  color: #b45309;
  font-size: 14px;
  font-weight: 600;
  padding: 12px;
  transition: opacity 0.15s;
}

.notification-action-active {
  border-color: #e2e8f0;
  color: #64748b;
}

.notification-spinner {
  width: 17px;
  height: 17px;
}
</style>
