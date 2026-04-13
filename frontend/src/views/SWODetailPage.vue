<template>
  <ion-page>

    <!-- Header -->
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between px-2 py-3 bg-white border-b border-slate-100">
        <div class="flex items-center gap-1">
          <button
            @click="router.back()"
            class="flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 active:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 class="text-base font-semibold text-gray-900">
            {{ swo ? (swo.work_order_number || swo.name) : '...' }}
          </h2>
        </div>
        <button
          @click="loadSWO"
          :title="__('Refresh')"
          class="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 active:bg-slate-100 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
    </ion-header>

    <ion-content style="--background: #f8fafc;">

      <!-- Loading -->
      <div v-if="loading" class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <span class="w-8 h-8 border-2 border-slate-200 border-t-blue-950 rounded-full animate-spin block" />
      </div>

      <!-- Load error -->
      <div
        v-else-if="!swo"
        class="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center text-slate-500"
      >
        <svg class="text-red-300" width="48" height="48" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="text-sm">{{ loadError }}</p>
        <button
          @click="loadSWO"
          class="px-4 h-9 rounded-xl border border-slate-200 bg-white text-sm font-medium text-gray-700 active:bg-slate-50"
        >
          {{ __('Retry') }}
        </button>
      </div>

      <div v-else class="space-y-4 p-4 pb-10">

        <!-- Status badge -->
        <div class="flex justify-center">
          <span
            class="text-sm font-semibold px-3 py-1 rounded-full"
            :class="statusClass(swo.status)"
          >
            {{ __(swo.status) }}
          </span>
        </div>

        <!-- Info card -->
        <div class="rounded-xl bg-white p-4 shadow-sm space-y-0">
          <div v-for="row in infoRows" :key="row.label"
               class="flex justify-between py-2 border-b border-slate-50 last:border-0 gap-3">
            <span class="text-sm text-slate-500 flex-shrink-0">{{ row.label }}</span>
            <span class="text-sm font-medium text-slate-800 text-right">{{ row.value }}</span>
          </div>
        </div>

        <!-- Equipment -->
        <div v-if="swo.equipment_selection?.length" class="rounded-xl bg-white p-4 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ __('Equipment') }}</p>
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

        <!-- Work sections: Parts + Documentation -->
        <template v-if="showWorkSections">

          <!-- Parts / Items -->
          <div class="rounded-xl bg-white shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p class="text-sm font-semibold text-slate-700">{{ __('Parts / Items') }}</p>
              <button
                v-if="isEditable"
                @click="showAddItemPanel = !showAddItemPanel"
                class="flex items-center gap-1 text-xs font-semibold text-blue-950 py-1 px-2.5 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {{ __('Add') }}
              </button>
            </div>
            <div class="px-4 py-3 space-y-0">
              <p v-if="localItems.length === 0" class="text-center text-sm text-slate-400 py-2">
                {{ __('No items added yet.') }}
              </p>
              <div
                v-for="(item, idx) in localItems"
                :key="idx"
                class="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0"
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

            <!-- Inline Add Item panel -->
            <div v-if="showAddItemPanel" class="mx-4 mb-4 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <p class="text-sm font-semibold text-slate-700">{{ __('Add Item') }}</p>

              <!-- Non-inventory toggle -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">{{ __('Non-inventory part') }}</span>
                <button
                  type="button"
                  @click="newItem.is_non_inventory = !newItem.is_non_inventory; newItem.item_code = ''; itemSearchResults = []"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                  :class="newItem.is_non_inventory ? 'bg-blue-950' : 'bg-slate-200'"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                    :class="newItem.is_non_inventory ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
              </div>

              <!-- Inventory item search -->
              <div v-if="!newItem.is_non_inventory" class="relative">
                <label class="block mb-1.5 text-sm text-slate-600">{{ __('Item Code') }} *</label>
                <input
                  type="text"
                  v-model="newItem.item_code"
                  :placeholder="__('Type to search...')"
                  @input="onItemSearch"
                  class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
                />
                <div
                  v-if="itemSearchResults.length"
                  class="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                  <button
                    v-for="r in itemSearchResults"
                    :key="r.name"
                    type="button"
                    class="flex w-full flex-col px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                    @click="selectItemResult(r)"
                  >
                    <span class="text-sm font-semibold text-slate-800">{{ r.name }}</span>
                    <span class="text-xs text-slate-500">{{ r.item_name }}</span>
                  </button>
                </div>
              </div>

              <!-- Non-inventory: part number -->
              <div v-if="newItem.is_non_inventory">
                <label class="block mb-1.5 text-sm text-slate-600">{{ __('Part Number') }}</label>
                <input
                  type="text"
                  v-model="newItem.part_number"
                  placeholder="e.g. ABC-001"
                  class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300"
                />
              </div>

              <div>
                <label class="block mb-1.5 text-sm text-slate-600">{{ __('Description') }}</label>
                <input type="text" v-model="newItem.description" :placeholder="__('Part description')"
                  class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
              </div>

              <div>
                <label class="block mb-1.5 text-sm text-slate-600">{{ __('Qty') }} *</label>
                <input type="number" v-model="newItem.qty" placeholder="1" step="0.01" min="0.01"
                  class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
              </div>

              <div>
                <label class="block mb-1.5 text-sm text-slate-600">{{ __('Vendor') }}</label>
                <input type="text" v-model="newItem.vendor" :placeholder="__('Optional')"
                  class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
              </div>

              <p v-if="itemPanelError" class="text-sm text-red-500">{{ itemPanelError }}</p>

              <div class="flex gap-2 pt-1">
                <button type="button" @click="closeAddItemPanel"
                  class="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  {{ __('Cancel') }}
                </button>
                <button type="button" @click="confirmAddItem"
                  class="flex-1 rounded-lg bg-blue-950 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 transition-colors">
                  {{ __('Add Item') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Documentation -->
          <div class="rounded-xl bg-white p-4 shadow-sm space-y-4">
            <p class="text-sm font-semibold text-slate-700">{{ __('Documentation') }}</p>
            <div>
              <label class="block mb-1.5 text-xs font-medium text-slate-500">{{ __('Problem With Equipment') }}</label>
              <textarea
                v-model="localDocs.problem_with_lift"
                :placeholder="isEditable ? __('Describe the reported problem...') : '—'"
                :readonly="!isEditable"
                rows="3"
                class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300 resize-none read-only:opacity-60 read-only:cursor-default"
              />
            </div>
            <div>
              <label class="block mb-1.5 text-xs font-medium text-slate-500">{{ __('Repair Description') }}</label>
              <textarea
                v-model="localDocs.repair_description"
                :placeholder="isEditable ? __('Describe the work performed...') : '—'"
                :readonly="!isEditable"
                rows="3"
                class="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300 resize-none read-only:opacity-60 read-only:cursor-default"
              />
            </div>
          </div>

        </template>

        <!-- Hours inline panel (Finish Repair for Labor Rate / Misc) -->
        <div v-if="showHoursPanel" class="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
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
            <button type="button" @click="showHoursPanel = false; hoursInput = ''; hoursError = ''"
              class="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              {{ __('Cancel') }}
            </button>
            <button type="button" @click="confirmFinishRepair" :disabled="acting"
              class="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span v-else>{{ __('Confirm') }}</span>
            </button>
          </div>
        </div>

        <!-- Action error -->
        <p v-if="actionError" class="text-sm text-red-600 text-center">{{ actionError }}</p>

        <!-- Status action buttons (New / Programmed / Released — outside footer) -->
        <div v-if="!isEditable && !isLocked" class="space-y-3">
          <button
            v-if="['New', 'Programmed'].includes(swo.status)"
            @click="act('Released')"
            :disabled="acting"
            class="w-full rounded-lg bg-blue-950 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-blue-900 active:bg-blue-800 disabled:opacity-50 transition-all"
          >
            <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span v-else>{{ __('Release') }}</span>
          </button>

          <button
            v-else-if="swo.status === 'Released'"
            @click="act('Repairing')"
            :disabled="acting"
            class="w-full rounded-lg bg-amber-500 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 transition-all"
          >
            <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span v-else>{{ __('Start Repair') }}</span>
          </button>
        </div>

        <!-- Locked notice -->
        <div
          v-if="['Completed', 'Invoiced', 'Cancelled'].includes(swo.status)"
          class="flex items-center justify-center gap-2 py-4 text-sm text-slate-400"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {{ __('This work order is locked for editing.') }}
        </div>

      </div>
    </ion-content>

    <!-- Footer: editable and Staged actions -->
    <ion-footer
      class="ion-no-border bg-white"
      v-if="swo && (isEditable || swo.status === 'Staged')"
    >
      <div class="px-4 py-3 border-t border-slate-100 bg-white">

        <!-- Editable footer (Repairing / Partial Repair) -->
        <div v-if="isEditable && !showHoursPanel" class="space-y-2">
          <!-- Save (primary, Navy Blue) -->
          <button
            @click="saveChanges"
            :disabled="saving || acting"
            class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-950 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-900 active:bg-blue-800 disabled:opacity-50 transition-all"
          >
            <span v-if="saving" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <template v-else>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {{ __('Save') }}
            </template>
          </button>

          <!-- Second row: Pause/Resume + Finish -->
          <div class="grid grid-cols-2 gap-2">
            <!-- Pause Repair (Amber) -->
            <button
              v-if="swo.status === 'Repairing'"
              @click="act('Partial Repair')"
              :disabled="saving || acting"
              class="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="10" y1="15" x2="10" y2="9"/>
                <line x1="14" y1="15" x2="14" y2="9"/>
              </svg>
              {{ __('Pause') }}
            </button>

            <!-- Resume -->
            <button
              v-else-if="swo.status === 'Partial Repair'"
              @click="act('Repairing')"
              :disabled="saving || acting"
              class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              {{ __('Resume') }}
            </button>

            <!-- Finish Repair (Emerald) -->
            <button
              @click="onFinishRepair"
              :disabled="saving || acting"
              class="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {{ __('Finish') }}
            </button>
          </div>
        </div>

        <!-- Staged footer: signature actions -->
        <div v-else-if="swo.status === 'Staged'" class="space-y-2">
          <template v-if="!swo.signature_link">
            <button
              @click="onGenerateLink"
              :disabled="acting"
              class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-950 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50 transition-all shadow-md"
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
              @click="openSignatureLink"
              class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-950 py-3 text-sm font-semibold text-white hover:bg-blue-900 transition-all shadow-md"
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

      </div>
    </ion-footer>

  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonHeader, IonContent, IonFooter } from '@ionic/vue'
import {
  getSWO, updateSWO, updateSWOStatus, searchItems, generateSignatureLink,
  type ServiceWorkOrderDetail, type SWOItem, type ItemResult,
} from '@/services/api'
import { formatDate } from '@/utils/date'

const route   = useRoute()
const router  = useRouter()
const docName = route.params.name as string
const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── State ──────────────────────────────────────────────────────────────────────
const swo         = ref<ServiceWorkOrderDetail | null>(null)
const loading     = ref(false)
const loadError   = ref('')
const acting      = ref(false)
const saving      = ref(false)
const actionError = ref('')
const localItems  = ref<SWOItem[]>([])
const localDocs   = ref({ problem_with_lift: '', repair_description: '' })

// Hours inline panel
const showHoursPanel = ref(false)
const hoursInput     = ref('')
const hoursError     = ref('')
let _pendingFinishPayload: Record<string, unknown> = {}

// Add Item panel
const showAddItemPanel  = ref(false)
const itemSearchResults = ref<ItemResult[]>([])
const itemPanelError    = ref('')
const newItem           = ref(blankNewItem())
let _searchTimer: ReturnType<typeof setTimeout> | null = null

// ── Computed ───────────────────────────────────────────────────────────────────
const EDITABLE_STATUSES     = ['Repairing', 'Partial Repair']
const WORK_SECTION_STATUSES = [...EDITABLE_STATUSES, 'Staged', 'Completed', 'Invoiced']

const isEditable       = computed(() => EDITABLE_STATUSES.includes(swo.value?.status ?? ''))
const isLocked         = computed(() => ['Staged', 'Completed', 'Invoiced', 'Cancelled'].includes(swo.value?.status ?? ''))
const showWorkSections = computed(() => WORK_SECTION_STATUSES.includes(swo.value?.status ?? ''))

const infoRows = computed(() => {
  if (!swo.value) return []
  const rows = [
    { label: __('Customer'),       value: swo.value.customer },
    { label: __('Service Type'),   value: __(swo.value.service_type) },
    { label: __('Scheduled Date'), value: formatDate(swo.value.scheduled_date) },
  ]
  if (swo.value.hour_meter)        rows.push({ label: __('Hour Meter'), value: swo.value.hour_meter })
  if (swo.value.po_number) rows.push({ label: __('PO Number'), value: swo.value.po_number })
  return rows
})

// ── Watch ──────────────────────────────────────────────────────────────────────
watch(swo, (doc) => {
  if (!doc) return
  localItems.value = (doc.service_items ?? []).map((i) => ({ ...i }))
  localDocs.value  = {
    problem_with_lift:  doc.problem_with_lift  ?? '',
    repair_description: doc.repair_description ?? '',
  }
})

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(loadSWO)

async function loadSWO() {
  loading.value   = true
  loadError.value = ''
  try {
    swo.value = await getSWO(docName)
  } catch {
    loadError.value = __('Could not load work order. Please try again.')
  } finally {
    loading.value = false
  }
}

// ── Save ───────────────────────────────────────────────────────────────────────
async function saveChanges() {
  actionError.value = ''
  saving.value      = true
  try {
    await updateSWO(docName, {
      service_items:      localItems.value,
      problem_with_lift:  localDocs.value.problem_with_lift,
      repair_description: localDocs.value.repair_description,
    })
    await loadSWO()
  } catch (err) {
    actionError.value = extractError(err)
  } finally {
    saving.value = false
  }
}

// ── Status transitions ─────────────────────────────────────────────────────────
async function act(newStatus: string) {
  actionError.value = ''
  acting.value      = true
  try {
    await updateSWOStatus(docName, newStatus)
    await loadSWO()
  } catch (err) {
    actionError.value = extractError(err)
  } finally {
    acting.value = false
  }
}

async function onFinishRepair() {
  if (!swo.value) return
  actionError.value = ''
  if (localItems.value.length === 0) {
    actionError.value = __('At least one part or item must be added before finishing the repair.')
    return
  }
  if (!localDocs.value.problem_with_lift.trim()) {
    actionError.value = __('Problem With Equipment is required before finishing the repair.')
    return
  }
  if (!localDocs.value.repair_description.trim()) {
    actionError.value = __('Repair Description is required before finishing the repair.')
    return
  }

  _pendingFinishPayload = {
    status:             'Staged',
    service_items:      localItems.value,
    problem_with_lift:  localDocs.value.problem_with_lift,
    repair_description: localDocs.value.repair_description,
  }

  if (!['Labor Rate', 'Misc'].includes(swo.value.service_type)) {
    acting.value = true
    try {
      await updateSWO(docName, _pendingFinishPayload)
      await loadSWO()
    } catch (err) {
      actionError.value = extractError(err)
    } finally {
      acting.value = false
    }
    return
  }

  hoursInput.value  = ''
  hoursError.value  = ''
  showHoursPanel.value = true
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
    await updateSWO(docName, { ..._pendingFinishPayload, hours_worked: hours })
    showHoursPanel.value = false
    await loadSWO()
  } catch (err) {
    actionError.value    = extractError(err)
    showHoursPanel.value = false
  } finally {
    acting.value = false
  }
}

// ── Signature link ─────────────────────────────────────────────────────────────
async function onGenerateLink() {
  actionError.value = ''
  acting.value      = true
  try {
    await generateSignatureLink(docName)
    await loadSWO()
  } catch (err) {
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

// ── Item panel ─────────────────────────────────────────────────────────────────
function blankNewItem() {
  return { is_non_inventory: false, item_code: '', part_number: '', description: '', qty: '1', vendor: '' }
}

function closeAddItemPanel() {
  showAddItemPanel.value  = false
  itemSearchResults.value = []
  itemPanelError.value    = ''
  newItem.value           = blankNewItem()
}

function onItemSearch(event: Event) {
  const q = (event.target as HTMLInputElement).value ?? ''
  itemSearchResults.value = []
  if (_searchTimer) clearTimeout(_searchTimer)
  if (!q || q.length < 2) return
  _searchTimer = setTimeout(async () => {
    itemSearchResults.value = await searchItems(q)
  }, 300)
}

function selectItemResult(result: ItemResult) {
  newItem.value.item_code   = result.name
  newItem.value.description = result.item_name
  itemSearchResults.value   = []
}

function confirmAddItem() {
  itemPanelError.value = ''
  const ni = newItem.value
  if (!ni.is_non_inventory && !ni.item_code) {
    itemPanelError.value = __('Item code is required.')
    return
  }
  if (ni.is_non_inventory && !ni.part_number && !ni.description) {
    itemPanelError.value = __('Part number or description is required.')
    return
  }
  const parsedQty = parseFloat(String(ni.qty))
  if (!parsedQty || parsedQty <= 0) {
    itemPanelError.value = __('Qty must be greater than 0.')
    return
  }
  localItems.value.push({
    is_non_inventory_part: ni.is_non_inventory ? 1 : 0,
    item_code:   ni.is_non_inventory ? undefined : ni.item_code    || undefined,
    part_number: ni.is_non_inventory ? ni.part_number || undefined : undefined,
    description: ni.description || undefined,
    qty:         parsedQty,
    vendor:      ni.vendor || undefined,
  })
  closeAddItemPanel()
}

function removeItem(idx: number) {
  localItems.value.splice(idx, 1)
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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
