<template>
  <!-- Full-screen modal — no card rounding, covers entire viewport -->
  <ion-modal
    :is-open="isOpen"
    :can-dismiss="canDismissHandler"
    @did-dismiss="onDismissed"
    style="--border-radius: 0;"
  >
    <!-- ── Header ────────────────────────────────────────────────────────── -->
    <ion-header class="ion-no-border">
      <ion-toolbar style="--background: #172554; --color: #fff; --min-height: 56px;">
        <ion-title style="font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em;">
          {{ modalTitle }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="attemptClose" style="--color: rgba(255,255,255,0.55);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Status sub-bar (edit mode only) -->
      <div
        v-if="isEditMode && swo"
        class="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white"
      >
        <span class="text-xs text-slate-500 truncate mr-2">{{ swo.customer }}</span>
        <span
          class="flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full"
          :class="statusClass(swo.status)"
        >
          {{ __(swo.status) }}
        </span>
      </div>
    </ion-header>

    <!-- ── Content ───────────────────────────────────────────────────────── -->
    <ion-content style="--background: #f8fafc;">

      <!-- Loading overlay -->
      <div v-if="loading" class="flex min-h-[50vh] items-center justify-center">
        <span class="w-8 h-8 border-2 border-slate-200 border-t-blue-950 rounded-full animate-spin block" />
      </div>

      <div v-else class="px-4 py-5 pb-10 space-y-5 max-w-lg mx-auto">

        <!-- ────────────────────────────────────────────────────────────────
             CREATE MODE
             ──────────────────────────────────────────────────────────────── -->
        <template v-if="!isEditMode">

          <!-- Customer -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">
              {{ __('Customer') }} <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="createForm.customer"
                @change="onCustomerChange"
                class="w-full bg-transparent text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 pr-8 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm appearance-none cursor-pointer"
                :class="!createForm.customer ? 'text-slate-400' : ''"
              >
                <option value="" disabled>{{ __('Select customer') }}</option>
                <option v-for="c in customers" :key="c.name" :value="c.name">
                  {{ c.customer_name }}
                </option>
              </select>
              <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                   width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          <!-- Scheduled Date -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">
              {{ __('Scheduled Date') }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="createForm.scheduled_date"
              @change="onDateChange"
              type="date"
              class="w-full bg-transparent text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm"
            />
          </div>

          <!-- Service Type -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">
              {{ __('Service Type') }} <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="createForm.service_type"
                @change="onServiceTypeChange"
                class="w-full bg-transparent text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 pr-8 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm appearance-none cursor-pointer"
                :class="!createForm.service_type ? 'text-slate-400' : ''"
              >
                <option value="" disabled>{{ __('Select type') }}</option>
                <option v-for="t in serviceTypeOptions" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
              <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                   width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          <!-- Equipment -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">
              {{ __('Equipment') }} <span class="text-red-500">*</span>
            </label>

            <!-- Misc: checkbox list -->
            <template v-if="isMisc">
              <div v-if="loadingEquipment" class="flex items-center gap-2 text-sm text-slate-400 py-2">
                <span class="w-4 h-4 border-2 border-slate-200 border-t-blue-950 rounded-full animate-spin block" />
                {{ __('Loading...') }}
              </div>
              <p v-else-if="!createForm.customer || !createForm.service_type" class="text-sm text-slate-400">
                {{ !createForm.service_type ? __('Select a service type first') : __('Select a customer first') }}
              </p>
              <p v-else-if="equipment.length === 0" class="text-sm text-amber-600">
                {{ __('No active equipment found for this customer on the selected date') }}
              </p>
              <div v-else class="space-y-1 border border-slate-200 rounded-md p-3 bg-white shadow-sm">
                <label
                  v-for="e in equipment" :key="e.name"
                  class="flex items-center gap-3 py-1.5 cursor-pointer rounded px-1 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    :value="e.name"
                    v-model="createForm.equipment_selection"
                    class="w-4 h-4 rounded border-slate-300 accent-blue-950"
                  />
                  <div>
                    <p class="text-sm font-semibold text-slate-700">{{ e.customer_unit_id_number }}</p>
                    <p class="text-xs text-slate-400">{{ e.name }}</p>
                  </div>
                </label>
              </div>
            </template>

            <!-- Single select -->
            <template v-else>
              <div class="relative">
                <select
                  v-model="singleEquipment"
                  :disabled="equipmentDisabled"
                  class="w-full bg-transparent text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 pr-8 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{{ equipmentPlaceholder }}</option>
                  <option v-for="e in equipment" :key="e.name" :value="e.name">
                    {{ e.customer_unit_id_number }} — {{ e.name }}
                  </option>
                </select>
                <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                     width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <p v-if="loadingEquipment" class="mt-1 text-xs text-slate-400">{{ __('Loading equipment...') }}</p>
              <p v-else-if="equipmentError" class="mt-1 text-xs text-red-500">{{ __('Could not load equipment') }}</p>
            </template>
          </div>

          <!-- Hour Meter -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Hour Meter') }}</label>
            <input
              v-model="createForm.hour_meter"
              type="text"
              inputmode="numeric"
              :placeholder="__('e.g. 1234')"
              class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm"
            />
          </div>

          <!-- PO Number -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">{{ __('PO Number') }}</label>
            <input
              v-model="createForm.po_number"
              type="text"
              :placeholder="__('Customer purchase order')"
              class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm"
            />
          </div>

        </template>

        <!-- ────────────────────────────────────────────────────────────────
             EDIT MODE
             ──────────────────────────────────────────────────────────────── -->
        <template v-else-if="swo">

          <!-- Read-only summary -->
          <div class="grid grid-cols-2 gap-3 bg-white rounded-xl p-4 shadow-sm">
            <div>
              <p class="text-xs text-slate-400 mb-0.5">{{ __('Service Type') }}</p>
              <p class="text-sm font-semibold text-slate-800">{{ __(swo.service_type) }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400 mb-0.5">{{ __('Scheduled Date') }}</p>
              <p class="text-sm font-semibold text-slate-800">{{ formatDate(swo.scheduled_date) }}</p>
            </div>
          </div>

          <!-- Equipment (read-only) -->
          <div v-if="swo.equipment_selection?.length" class="bg-white rounded-xl p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{{ __('Equipment') }}</p>
            <div
              v-for="row in swo.equipment_selection"
              :key="row.name"
              class="flex items-center gap-2 py-1 text-sm text-slate-700"
            >
              <svg class="flex-shrink-0 text-slate-400" width="13" height="13"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              <span>{{ row.equipment }}</span>
            </div>
          </div>

          <!-- Hour Meter (editable) -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Hour Meter') }}</label>
            <input
              v-model="editForm.hour_meter"
              type="text"
              inputmode="numeric"
              :placeholder="__('e.g. 1234')"
              :readonly="isLocked"
              class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm read-only:opacity-60 read-only:cursor-default"
            />
          </div>

          <!-- PO Number (editable) -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">{{ __('PO Number') }}</label>
            <input
              v-model="editForm.po_number"
              type="text"
              :placeholder="__('Customer purchase order')"
              :readonly="isLocked"
              class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm read-only:opacity-60 read-only:cursor-default"
            />
          </div>

          <!-- Documentation -->
          <template v-if="showDocumentation">
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Problem With Equipment') }}</label>
              <textarea
                v-model="editForm.problem_with_lift"
                rows="3"
                :placeholder="isEditable ? __('Describe the reported problem...') : ''"
                :readonly="isLocked"
                class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm resize-none read-only:opacity-60 read-only:cursor-default"
              />
            </div>
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Repair Description') }}</label>
              <textarea
                v-model="editForm.repair_description"
                rows="4"
                :placeholder="isEditable ? __('Describe the work performed...') : ''"
                :readonly="isLocked"
                class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm resize-none read-only:opacity-60 read-only:cursor-default"
              />
            </div>
          </template>

          <!-- Parts / Items (Repairing, Partial Repair, and read-only for locked) -->
          <div v-if="showDocumentation" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-700">{{ __('Parts / Items') }}</span>
              <button
                v-if="isEditable"
                type="button"
                @click="openPartSheet"
                class="flex items-center gap-1 text-xs font-semibold text-blue-950 py-1 px-2.5 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {{ __('Add') }}
              </button>
            </div>

            <!-- Item list -->
            <div v-if="localItems.length" class="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                v-for="(item, idx) in localItems"
                :key="idx"
                class="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">
                    {{ item.item_code || item.part_number || '—' }}
                  </p>
                  <p class="text-xs text-slate-500">{{ item.description }}</p>
                  <p class="text-xs text-slate-400">
                    {{ __('Qty') }}: {{ item.qty }}
                    <span v-if="item.vendor"> · {{ item.vendor }}</span>
                  </p>
                </div>
                <button
                  v-if="isEditable"
                  type="button"
                  @click="removeItem(idx)"
                  class="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
            <p v-else-if="isEditable" class="text-sm text-slate-400 text-center py-1">
              {{ __('No items added yet.') }}
            </p>

          </div>

          <!-- Hours input (inline, for Finish Repair on Labor Rate / Misc) -->
          <div v-if="showHoursInput" class="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p class="text-sm font-semibold text-amber-800">{{ __('Enter hours worked to finish the repair') }}</p>
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Hours Worked') }} *</label>
              <input
                v-model="hoursInput"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 2.5"
                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-amber-200 rounded-md px-3 py-2 focus:outline-none focus:border-amber-400 shadow-sm transition duration-300"
              />
              <p v-if="hoursError" class="mt-1 text-xs text-red-500">{{ hoursError }}</p>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                @click="showHoursInput = false; hoursInput = ''; hoursError = ''"
                class="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {{ __('Cancel') }}
              </button>
              <button
                type="button"
                @click="confirmFinishRepair"
                :disabled="acting"
                class="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span v-else>{{ __('Confirm') }}</span>
              </button>
            </div>
          </div>

          <!-- Signature section (Staged) -->
          <div v-if="swo.status === 'Staged'" class="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ __('Customer Signature') }}</p>

            <template v-if="!swo.signature_link">
              <button
                type="button"
                @click="onGenerateLink"
                :disabled="acting"
                class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-950 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-md"
              >
                <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <template v-else>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  {{ __('Generate Signature Link') }}
                </template>
              </button>
            </template>

            <template v-else>
              <button
                type="button"
                @click="openSignatureLink"
                class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-950 py-3 text-sm font-semibold text-white hover:bg-blue-900 transition-colors shadow-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                {{ __('Open Signature Link') }}
              </button>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="copySignatureLink"
                  class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {{ __('Copy Link') }}
                </button>
                <button
                  type="button"
                  @click="onGenerateLink"
                  :disabled="acting"
                  class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  {{ __('Regenerate') }}
                </button>
              </div>
            </template>
          </div>

          <!-- Locked notice (Completed / Invoiced / Cancelled) -->
          <div
            v-if="isLocked && swo.status !== 'Staged'"
            class="flex items-center gap-2 text-sm text-slate-400 justify-center py-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {{ __('This work order is locked for editing.') }}
          </div>

        </template>

        <!-- Action error -->
        <p v-if="actionError" class="text-sm text-red-600 text-center">{{ actionError }}</p>

      </div>
    </ion-content>

    <!-- ── Footer: lifecycle action buttons ──────────────────────────────── -->
    <ion-footer class="ion-no-border" v-if="!loading">
      <div class="bg-white border-t border-slate-100 px-4 py-3 space-y-2 max-w-lg mx-auto">

        <!-- CREATE MODE -->
        <template v-if="!isEditMode">
          <button
            style="width:100%; background:#172554; color:#fff; border-radius:8px; padding:14px; font-size:14px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:opacity .15s;"
            :style="submitting ? 'opacity:.5;cursor:not-allowed;' : ''"
            :disabled="submitting"
            @click="handleCreate"
          >
            <span v-if="submitting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span v-else>{{ __('Create Work Order') }}</span>
          </button>
        </template>

        <!-- EDIT MODE -->
        <template v-else-if="swo && !showHoursInput">

          <!-- New / Programmed → Release (Navy Blue) -->
          <button
            v-if="['New', 'Programmed'].includes(swo.status)"
            style="width:100%; background:#172554; color:#fff; border-radius:8px; padding:14px; font-size:14px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:opacity .15s;"
            :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''"
            :disabled="acting"
            @click="act('Released')"
          >
            <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span v-else>{{ __('Release') }}</span>
          </button>

          <!-- Released → Start Repair (Amber) -->
          <button
            v-else-if="swo.status === 'Released'"
            style="width:100%; background:#f59e0b; color:#fff; border-radius:8px; padding:14px; font-size:14px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:opacity .15s;"
            :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''"
            :disabled="acting"
            @click="act('Repairing')"
          >
            <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span v-else>{{ __('Start Repair') }}</span>
          </button>

          <!-- Repairing / Partial Repair: icon-only 3-button bar -->
          <template v-else-if="isEditable">
            <div class="flex items-stretch gap-2">

              <!-- Save & Close (Navy Blue) -->
              <button
                :title="__('Save & Close')"
                :disabled="saving"
                @click="handleSaveAndClose"
                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; background:#172554; color:#fff; transition:opacity .15s;"
                :style="saving ? 'opacity:.5;cursor:not-allowed;' : ''"
              >
                <span v-if="saving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                <template v-else>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{ __('Save') }}</span>
                </template>
              </button>

              <!-- Pause Repair (Amber) / Resume (Slate outline) -->
              <button
                v-if="swo.status === 'Repairing'"
                :title="__('Pause Repair')"
                :disabled="acting"
                @click="act('Partial Repair')"
                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; background:#f59e0b; color:#fff; transition:opacity .15s;"
                :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''"
              >
                <span v-if="acting && lastAction === 'Partial Repair'"
                      class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                <template v-else>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{ __('Pause') }}</span>
                </template>
              </button>
              <button
                v-else-if="swo.status === 'Partial Repair'"
                :title="__('Resume')"
                :disabled="acting"
                @click="act('Repairing')"
                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; border:1.5px solid #e2e8f0; color:#475569; transition:opacity .15s;"
                :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''"
              >
                <span v-if="acting && lastAction === 'Repairing'"
                      class="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin block" />
                <template v-else>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{ __('Resume') }}</span>
                </template>
              </button>

              <!-- Finish Repair (Emerald) -->
              <button
                :title="__('Finish Repair')"
                :disabled="acting || saving"
                @click="onFinishRepair"
                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; background:#059669; color:#fff; transition:opacity .15s;"
                :style="(acting || saving) ? 'opacity:.5;cursor:not-allowed;' : ''"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{ __('Finish') }}</span>
              </button>

            </div>
          </template>

        </template>

      </div>
    </ion-footer>

    <!-- ── Add Part bottom sheet ─────────────────────────────────────────── -->
    <ion-modal
      :is-open="showPartSheet"
      :initial-breakpoint="0.85"
      :breakpoints="[0, 0.85, 1]"
      style="--border-radius: 16px;"
      @did-dismiss="closePartSheet"
    >
      <!-- Fixed header: Add (left) | Title (center) | Close X (right) -->
      <ion-header class="ion-no-border">
        <ion-toolbar style="--background: #fff; --min-height: 56px;">
          <!-- Left: primary action — native pill button to bypass Ionic clear-fill default -->
          <ion-buttons slot="start" style="padding-left: 8px;">
            <button
              @click="confirmAddPart"
              style="background:#172554; color:#fff; border-radius:9999px; padding:6px 16px; font-size:14px; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:opacity .15s; white-space:nowrap; cursor:pointer;"
            >
              {{ __('Add') }}
            </button>
          </ion-buttons>

          <ion-title style="font-size: 15px; font-weight: 700; color: #0f172a; text-align: center;">
            {{ __('Add Part') }}
          </ion-title>

          <!-- Right: dismiss -->
          <ion-buttons slot="end">
            <ion-button @click="closePartSheet" style="--color: #ef4444;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <div style="height:1px; background:#f1f5f9;"/>
      </ion-header>

      <ion-content style="--background: #f8fafc;">
        <div class="px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto" style="color:#0f172a;">

          <!-- Non-inventory checkbox (explicit styled — bypasses Material Tailwind reset) -->
          <label
            class="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm cursor-pointer select-none"
            @click.prevent="partForm.is_non_inventory = !partForm.is_non_inventory; partForm.item_code = ''; partForm.part_number = ''; partForm.description = ''; sheetItemSearchResults = []"
          >
            <span
              class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors duration-150"
              :style="partForm.is_non_inventory
                ? 'background:#172554; border-color:#172554;'
                : 'background:#fff; border-color:#94a3b8;'"
            >
              <svg
                v-if="partForm.is_non_inventory"
                width="11" height="11" viewBox="0 0 12 12"
                fill="none" stroke="white" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"
              >
                <polyline points="1.5 6 4.5 9 10.5 3"/>
              </svg>
            </span>
            <span class="text-sm font-medium text-slate-800">{{ __('Non-inventory part') }}</span>
          </label>

          <!-- INVENTORY PART -->
          <template v-if="!partForm.is_non_inventory">
            <!-- Item Code search -->
            <div class="relative">
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Item Code') }} <span class="text-red-500">*</span></label>
              <input
                type="text"
                v-model="partForm.item_code"
                :placeholder="__('Type to search...')"
                @input="onSheetItemSearch"
                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
              />
              <div
                v-if="sheetItemSearchResults.length"
                class="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                <button
                  v-for="r in sheetItemSearchResults"
                  :key="r.name"
                  type="button"
                  class="flex w-full flex-col px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  @click="selectSheetItemResult(r)"
                >
                  <span class="text-sm font-semibold text-slate-800">{{ r.name }}</span>
                  <span class="text-xs text-slate-500">{{ r.item_name }}</span>
                </button>
              </div>
            </div>
            <!-- Part Number (auto-filled, read-only) -->
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Part Number') }}</label>
              <input
                type="text"
                v-model="partForm.part_number"
                readonly
                :placeholder="__('Auto-filled from item')"
                class="w-full bg-slate-50 placeholder:text-slate-400 text-slate-600 text-sm border border-slate-200 rounded-md px-3 py-2 cursor-default"
              />
            </div>
            <!-- Description (auto-filled, editable) -->
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Description') }}</label>
              <input
                type="text"
                v-model="partForm.description"
                :placeholder="__('Auto-filled from item')"
                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
              />
            </div>
          </template>

          <!-- NON-INVENTORY PART -->
          <template v-else>
            <!-- Part Number -->
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Part Number') }}</label>
              <input
                type="text"
                v-model="partForm.part_number"
                placeholder="e.g. ABC-001"
                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
              />
            </div>
            <!-- Vendor -->
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Vendor') }}</label>
              <input
                type="text"
                v-model="partForm.vendor"
                :placeholder="__('Optional')"
                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
              />
            </div>
            <!-- Description -->
            <div>
              <label class="block mb-1.5 text-sm text-slate-600">{{ __('Description') }}</label>
              <input
                type="text"
                v-model="partForm.description"
                :placeholder="__('Part description')"
                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
              />
            </div>
          </template>

          <!-- Qty (always shown) -->
          <div>
            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Qty') }} <span class="text-red-500">*</span></label>
            <input
              type="number"
              v-model="partForm.qty"
              placeholder="1"
              step="0.01"
              min="0.01"
              class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
            />
          </div>

          <p v-if="partSheetError" class="text-sm text-red-500 text-center">{{ partSheetError }}</p>

        </div>
      </ion-content>

    </ion-modal>

  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, nextTick } from 'vue'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, alertController,
} from '@ionic/vue'
import {
  getCustomers, getCompanies, getCustomerEquipment, createSWO, getSWO,
  updateSWO, updateSWOStatus, searchItems, generateSignatureLink,
  type Customer, type Equipment, type Company,
  type ServiceWorkOrderDetail, type SWOItem, type ItemResult,
} from '@/services/api'
import { formatDate } from '@/utils/date'

// ── Props / Emits ──────────────────────────────────────────────────────────────
const props = defineProps<{
  isOpen:  boolean
  swoName: string | null   // null = create mode, string = edit mode
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'saved'): void
}>()

const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── Mode ───────────────────────────────────────────────────────────────────────
const isEditMode = computed(() => props.swoName !== null)

const modalTitle = computed(() => {
  if (!isEditMode.value) return __('New Work Order')
  if (!swo.value) return props.swoName || '...'
  return `${__('Edit')} ${swo.value.work_order_number || props.swoName}`
})

// ── Shared state ───────────────────────────────────────────────────────────────
const isDirty     = ref(false)
const loading     = ref(false)
const submitting  = ref(false)
const saving      = ref(false)
const acting      = ref(false)
const lastAction  = ref('')
const actionError = ref('')

// ──────────────────────────────────────────────────────────────────────────────
// CREATE MODE STATE
// ──────────────────────────────────────────────────────────────────────────────
const customers        = ref<Customer[]>([])
const equipment        = ref<Equipment[]>([])
const companies        = ref<Company[]>([])
const loadingEquipment = ref(false)
const equipmentError   = ref(false)
const singleEquipment  = ref('')

const createForm = ref({
  customer:            '',
  scheduled_date:      todayISO(),
  service_type:        '',
  equipment_selection: [] as string[],
  hour_meter:          '',
  po_number:  '',
})

const isMisc = computed(() => createForm.value.service_type === 'Misc')

const serviceTypeOptions = [
  { label: 'PM Frequency', value: 'PM Frequency' },
  { label: 'Misc',         value: 'Misc' },
  { label: 'Labor Rate',   value: 'Labor Rate' },
]

const equipmentPlaceholder = computed(() =>
  equipmentDisabled.value ? __('Select customer & type first') : __('Select equipment')
)

const equipmentDisabled = computed(() =>
  !createForm.value.service_type ||
  !createForm.value.customer     ||
  loadingEquipment.value         ||
  equipment.value.length === 0
)

watch(createForm, () => {
  if (isEditMode.value) return
  const f = createForm.value
  isDirty.value = !!(
    f.customer || f.service_type || f.hour_meter ||
    f.po_number || f.equipment_selection.length
  )
}, { deep: true })

// ──────────────────────────────────────────────────────────────────────────────
// EDIT MODE STATE
// ──────────────────────────────────────────────────────────────────────────────
const swo = ref<ServiceWorkOrderDetail | null>(null)

const editForm = ref({
  hour_meter:         '',
  po_number: '',
  problem_with_lift:  '',
  repair_description: '',
})
const _originalEditForm = ref({ ...editForm.value })

// Items
const localItems       = ref<SWOItem[]>([])
let _originalItemsJSON = '[]'

// Add Part sheet
const showPartSheet          = ref(false)
const sheetItemSearchResults = ref<ItemResult[]>([])
const partSheetError         = ref('')
const partForm               = ref(blankPartForm())
let _sheetSearchTimer: ReturnType<typeof setTimeout> | null = null

// Hours inline input
const showHoursInput = ref(false)
const hoursInput     = ref('')
const hoursError     = ref('')
let _finishPayload: Record<string, unknown> = {}

// Derived status flags
const status           = computed(() => swo.value?.status ?? '')
const isEditable       = computed(() => ['Repairing', 'Partial Repair'].includes(status.value))
const isLocked         = computed(() => ['Staged', 'Completed', 'Invoiced', 'Cancelled'].includes(status.value))
const showDocumentation = computed(() =>
  ['Repairing', 'Partial Repair', 'Staged', 'Completed', 'Invoiced'].includes(status.value)
)

// Populate edit form when SWO loads
watch(swo, async (doc) => {
  if (!doc) return
  const snapshot = {
    hour_meter:         doc.hour_meter         ?? '',
    po_number: doc.po_number ?? '',
    problem_with_lift:  doc.problem_with_lift  ?? '',
    repair_description: doc.repair_description ?? '',
  }
  editForm.value          = { ...snapshot }
  _originalEditForm.value = { ...snapshot }
  localItems.value        = (doc.service_items ?? []).map((i) => ({ ...i }))
  _originalItemsJSON      = JSON.stringify(localItems.value)
  await nextTick()
  isDirty.value = false
})

// Detect unsaved changes in edit form
watch(editForm, (val) => {
  if (!isEditMode.value) return
  const formChanged  = JSON.stringify(val) !== JSON.stringify(_originalEditForm.value)
  const itemsChanged = JSON.stringify(localItems.value) !== _originalItemsJSON
  isDirty.value = formChanged || itemsChanged
}, { deep: true })

// Detect unsaved item changes
watch(localItems, () => {
  if (!isEditMode.value) return
  const formChanged  = JSON.stringify(editForm.value) !== JSON.stringify(_originalEditForm.value)
  const itemsChanged = JSON.stringify(localItems.value) !== _originalItemsJSON
  isDirty.value = formChanged || itemsChanged
}, { deep: true })

// ──────────────────────────────────────────────────────────────────────────────
// MODAL LIFECYCLE
// ──────────────────────────────────────────────────────────────────────────────
watch(() => props.isOpen, async (open) => {
  if (!open) return
  isDirty.value     = false
  actionError.value = ''

  if (!isEditMode.value) {
    loading.value = true
    try {
      const [c, co] = await Promise.all([getCustomers(), getCompanies()])
      customers.value = c
      companies.value = co
    } finally {
      loading.value = false
    }
  } else {
    await loadSWO()
  }
})

function onDismissed() {
  createForm.value = {
    customer: '', scheduled_date: todayISO(), service_type: '',
    equipment_selection: [], hour_meter: '', po_number: '',
  }
  singleEquipment.value  = ''
  equipment.value        = []
  swo.value              = null
  isDirty.value          = false
  showHoursInput.value          = false
  hoursInput.value              = ''
  hoursError.value              = ''
  actionError.value             = ''
  showPartSheet.value           = false
  sheetItemSearchResults.value  = []
  partSheetError.value          = ''
  localItems.value              = []
  partForm.value                = blankPartForm()
}

async function loadSWO() {
  if (!props.swoName) return
  loading.value = true
  try {
    swo.value = await getSWO(props.swoName)
  } finally {
    loading.value = false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CLOSE + DIRTY STATE GUARD
// ──────────────────────────────────────────────────────────────────────────────
async function canDismissHandler(): Promise<boolean> {
  return !isDirty.value
}

async function attemptClose() {
  if (!isDirty.value) {
    emit('update:isOpen', false)
    return
  }
  const alert = await alertController.create({
    header:  __('Unsaved Changes'),
    message: __('Exit without saving changes?'),
    buttons: [
      { text: __('Cancel'), role: 'cancel' },
      {
        text:    __('Exit'),
        role:    'destructive',
        handler: () => {
          isDirty.value = false
          emit('update:isOpen', false)
        },
      },
    ],
  })
  await alert.present()
}

// ──────────────────────────────────────────────────────────────────────────────
// CREATE HANDLERS
// ──────────────────────────────────────────────────────────────────────────────
function onServiceTypeChange() {
  createForm.value.equipment_selection = []
  singleEquipment.value = ''
}

async function onCustomerChange() {
  createForm.value.equipment_selection = []
  singleEquipment.value = ''
  equipment.value       = []
  equipmentError.value  = false
  if (createForm.value.customer) await fetchEquipment()
}

async function onDateChange() {
  createForm.value.equipment_selection = []
  singleEquipment.value = ''
  equipment.value       = []
  equipmentError.value  = false
  if (createForm.value.customer && createForm.value.scheduled_date) await fetchEquipment()
}

async function fetchEquipment() {
  loadingEquipment.value = true
  equipmentError.value   = false
  try {
    equipment.value = await getCustomerEquipment(
      createForm.value.customer,
      createForm.value.scheduled_date,
    )
  } catch {
    equipment.value      = []
    equipmentError.value = true
  } finally {
    loadingEquipment.value = false
  }
}

async function handleCreate() {
  actionError.value = ''

  if (!isMisc.value) {
    createForm.value.equipment_selection = singleEquipment.value
      ? [singleEquipment.value]
      : []
  }

  const f = createForm.value
  if (!f.customer)                        { actionError.value = __('Customer is required.');       return }
  if (!f.scheduled_date)                  { actionError.value = __('Scheduled date is required.'); return }
  if (!f.service_type)                    { actionError.value = __('Service type is required.');   return }
  if (f.equipment_selection.length === 0) { actionError.value = __('Equipment is required.');      return }

  const company = companies.value[0]?.name ?? ''
  if (!company) { actionError.value = __('No company configured.'); return }

  submitting.value = true
  try {
    await createSWO({
      customer:            f.customer,
      company,
      service_type:        f.service_type,
      scheduled_date:      f.scheduled_date,
      equipment_selection: f.equipment_selection.map((e) => ({ equipment: e })),
      hour_meter:          f.hour_meter         || undefined,
      po_number:  f.po_number || undefined,
    })
    isDirty.value = false
    emit('saved')
    emit('update:isOpen', false)
  } catch (err: unknown) {
    actionError.value = extractError(err)
  } finally {
    submitting.value = false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// EDIT HANDLERS
// ──────────────────────────────────────────────────────────────────────────────
async function handleSaveAndClose() {
  if (!props.swoName) return
  actionError.value = ''
  saving.value      = true
  try {
    await updateSWO(props.swoName, {
      hour_meter:         editForm.value.hour_meter,
      po_number: editForm.value.po_number,
      problem_with_lift:  editForm.value.problem_with_lift,
      repair_description: editForm.value.repair_description,
      service_items:      localItems.value,
    })
    isDirty.value = false
    emit('saved')
    emit('update:isOpen', false)
  } catch (err: unknown) {
    actionError.value = extractError(err)
  } finally {
    saving.value = false
  }
}

async function act(newStatus: string) {
  if (!props.swoName) return
  actionError.value = ''
  acting.value      = true
  lastAction.value  = newStatus
  try {
    await updateSWOStatus(props.swoName, newStatus)
    // Terminal transitions: close the modal; otherwise reload to refresh status
    if (['Released', 'Staged'].includes(newStatus)) {
      isDirty.value = false
      emit('saved')
      emit('update:isOpen', false)
    } else {
      await loadSWO()
    }
  } catch (err: unknown) {
    actionError.value = extractError(err)
  } finally {
    acting.value = false
  }
}

async function onFinishRepair() {
  if (!swo.value) return
  actionError.value = ''

  if (!editForm.value.problem_with_lift.trim()) {
    actionError.value = __('Problem With Equipment is required before finishing the repair.')
    return
  }
  if (!editForm.value.repair_description.trim()) {
    actionError.value = __('Repair Description is required before finishing the repair.')
    return
  }

  _finishPayload = {
    status:             'Staged',
    hour_meter:         editForm.value.hour_meter,
    po_number: editForm.value.po_number,
    problem_with_lift:  editForm.value.problem_with_lift,
    repair_description: editForm.value.repair_description,
    service_items:      localItems.value,
  }

  if (!['Labor Rate', 'Misc'].includes(swo.value.service_type)) {
    // PM Frequency: no hours needed — transition directly to Staged
    acting.value = true
    try {
      await updateSWO(props.swoName!, _finishPayload)
      isDirty.value = false
      emit('saved')
      emit('update:isOpen', false)
    } catch (err: unknown) {
      actionError.value = extractError(err)
    } finally {
      acting.value = false
    }
    return
  }

  // Labor Rate / Misc: prompt for hours worked
  hoursInput.value     = ''
  hoursError.value     = ''
  showHoursInput.value = true
}

async function confirmFinishRepair() {
  hoursError.value = ''
  const hours = parseFloat(hoursInput.value)
  if (!hours || hours <= 0) {
    hoursError.value = __('Please enter a valid number of hours.')
    return
  }
  acting.value = true
  try {
    await updateSWO(props.swoName!, { ..._finishPayload, hours_worked: hours })
    isDirty.value        = false
    showHoursInput.value = false
    emit('saved')
    emit('update:isOpen', false)
  } catch (err: unknown) {
    actionError.value    = extractError(err)
    showHoursInput.value = false
  } finally {
    acting.value = false
  }
}

// ── Signature link ────────────────────────────────────────────────────────────
async function onGenerateLink() {
  if (!props.swoName) return
  actionError.value = ''
  acting.value      = true
  try {
    await generateSignatureLink(props.swoName)
    await loadSWO()
  } catch (err: unknown) {
    actionError.value = extractError(err)
  } finally {
    acting.value = false
  }
}

function openSignatureLink() {
  if (swo.value?.signature_link) window.open(swo.value.signature_link, '_blank')
}

async function copySignatureLink() {
  if (!swo.value?.signature_link) return
  try {
    await navigator.clipboard.writeText(swo.value.signature_link)
  } catch {
    const el = document.createElement('textarea')
    el.value = swo.value.signature_link
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

// ── Part sheet ────────────────────────────────────────────────────────────────
function blankPartForm() {
  return {
    is_non_inventory: false,
    item_code:        '',
    part_number:      '',
    description:      '',
    qty:              '1',
    vendor:           '',
  }
}

function openPartSheet() {
  partForm.value               = blankPartForm()
  sheetItemSearchResults.value = []
  partSheetError.value         = ''
  showPartSheet.value          = true
}

function closePartSheet() {
  showPartSheet.value          = false
  sheetItemSearchResults.value = []
  partSheetError.value         = ''
  partForm.value               = blankPartForm()
}

function onSheetItemSearch(event: Event) {
  const q = (event.target as HTMLInputElement).value ?? ''
  sheetItemSearchResults.value = []
  if (_sheetSearchTimer) clearTimeout(_sheetSearchTimer)
  if (!q || q.length < 2) return
  _sheetSearchTimer = setTimeout(async () => {
    sheetItemSearchResults.value = await searchItems(q)
  }, 300)
}

function selectSheetItemResult(result: ItemResult) {
  partForm.value.item_code    = result.name
  partForm.value.part_number  = result.custom_component ?? ''
  partForm.value.description  = result.description ?? result.item_name ?? ''
  sheetItemSearchResults.value = []
}

function confirmAddPart() {
  partSheetError.value = ''
  const p = partForm.value
  if (!p.is_non_inventory && !p.item_code) {
    partSheetError.value = __('Item code is required.')
    return
  }
  if (p.is_non_inventory && !p.part_number && !p.description) {
    partSheetError.value = __('Part number or description is required.')
    return
  }
  const parsedQty = parseFloat(String(p.qty))
  if (!parsedQty || parsedQty <= 0) {
    partSheetError.value = __('Qty must be greater than 0.')
    return
  }
  localItems.value.push({
    is_non_inventory_part: p.is_non_inventory ? 1 : 0,
    item_code:   p.is_non_inventory ? undefined : p.item_code   || undefined,
    part_number: p.part_number || undefined,
    description: p.description || undefined,
    qty:         parsedQty,
    vendor:      p.is_non_inventory ? p.vendor || undefined : undefined,
  })
  closePartSheet()
}

function removeItem(idx: number) {
  localItems.value.splice(idx, 1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function extractError(err: unknown): string {
  const e = err as { _error_message?: string; message?: string }
  return e?._error_message ?? e?.message ?? __('Action failed. Please try again.')
}

function statusClass(s: string): string {
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
  return map[s] ?? 'bg-slate-100 text-slate-600'
}
</script>
