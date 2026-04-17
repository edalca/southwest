<template>
  <ion-page>

    <!-- Header -->
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between px-2 py-3 bg-white border-b border-slate-100">
        <div class="flex items-center gap-1">
          <ion-button
            fill="clear"
            @click="router.back()"
            class="header-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </ion-button>
          <h2 class="text-base font-semibold text-gray-900">
            {{ swo ? (swo.work_order_number || swo.name) : '...' }}
          </h2>
        </div>
        <ion-button
          fill="clear"
          @click="loadSWO"
          class="header-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </ion-button>
      </div>
    </ion-header>

    <ion-content style="--background: #f8fafc;">

      <!-- Loading -->
      <div v-if="loading" class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <ion-spinner name="crescent" />
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
        <ion-button
          fill="outline"
          color="medium"
          @click="loadSWO"
        >
          {{ __('Retry') }}
        </ion-button>
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
              <ion-button
                v-if="isEditable"
                size="small"
                fill="clear"
                class="text-xs font-semibold"
                style="--color: #172554; margin:0;"
                @click="showAddItemPanel = !showAddItemPanel"
              >
                <div class="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {{ __('Add') }}
                </div>
              </ion-button>
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
                <ion-button
                  v-if="isEditable"
                  fill="clear"
                  color="danger"
                  size="small"
                  class="remove-btn"
                  @click="removeItem(idx)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </ion-button>
              </div>
            </div>

            <!-- Inline Add Item panel -->
            <div v-if="showAddItemPanel" class="mx-4 mb-4 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <p class="text-sm font-semibold text-slate-700">{{ __('Add Item') }}</p>

              <!-- Non-inventory toggle -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">{{ __('Non-inventory part') }}</span>
                <ion-toggle
                  mode="md"
                  :checked="newItem.is_non_inventory"
                  @ionChange="newItem.is_non_inventory = $event.detail.checked; newItem.item_code = ''; itemSearchResults = []"
                />
              </div>

              <!-- Inventory item search -->
              <div v-if="!newItem.is_non_inventory" class="relative">
                <ion-input
                  fill="outline"
                  :label="__('Item Code') + ' *'"
                  label-placement="stacked"
                  v-model="newItem.item_code"
                  :placeholder="__('Type to search...')"
                  @input="onItemSearch"
                  class="custom-ion-input"
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
                <ion-input
                  fill="outline"
                  :label="__('Part Number')"
                  label-placement="stacked"
                  v-model="newItem.part_number"
                  placeholder="e.g. ABC-001"
                  class="custom-ion-input"
                />
              </div>

              <div>
                <ion-input
                  fill="outline"
                  :label="__('Description')"
                  label-placement="stacked"
                  v-model="newItem.description"
                  :placeholder="__('Part description')"
                  class="custom-ion-input"
                />
              </div>

              <div>
                <ion-input
                  fill="outline"
                  type="number"
                  :label="__('Qty') + ' *'"
                  label-placement="stacked"
                  v-model="newItem.qty"
                  placeholder="1"
                  class="custom-ion-input"
                />
              </div>

              <div>
                <ion-input
                  fill="outline"
                  :label="__('Vendor')"
                  label-placement="stacked"
                  v-model="newItem.vendor"
                  :placeholder="__('Optional')"
                  class="custom-ion-input"
                />
              </div>

              <p v-if="itemPanelError" class="text-sm text-red-500">{{ itemPanelError }}</p>

              <div class="flex gap-2 pt-1">
                <ion-button
                  fill="outline"
                  color="medium"
                  class="flex-1"
                  @click="closeAddItemPanel"
                >
                  {{ __('Cancel') }}
                </ion-button>
                <ion-button
                  color="dark"
                  class="flex-1"
                  @click="confirmAddItem"
                >
                  {{ __('Add Item') }}
                </ion-button>
              </div>
            </div>
          </div>

          <!-- Documentation -->
          <div class="rounded-xl bg-white p-4 shadow-sm space-y-4">
            <p class="text-sm font-semibold text-slate-700">{{ __('Documentation') }}</p>
            <div>
              <ion-textarea
                fill="outline"
                :label="__('Problem With Equipment')"
                label-placement="stacked"
                v-model="localDocs.problem_with_lift"
                :placeholder="isEditable ? __('Describe the reported problem...') : '—'"
                :readonly="!isEditable"
                auto-grow
                :rows="3"
                class="custom-ion-input"
              />
            </div>
            <div>
              <ion-textarea
                fill="outline"
                :label="__('Repair Description')"
                label-placement="stacked"
                v-model="localDocs.repair_description"
                :placeholder="isEditable ? __('Describe the work performed...') : '—'"
                :readonly="!isEditable"
                auto-grow
                :rows="3"
                class="custom-ion-input"
              />
            </div>
          </div>

        </template>

        <!-- Hours inline panel (Finish Repair for Labor Rate / Misc) -->
        <div v-if="showHoursPanel" class="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p class="text-sm font-semibold text-amber-800">{{ __('Enter hours worked to finish the repair') }}</p>
          <div>
            <ion-input
              fill="outline"
              type="number"
              step="0.1"
              :label="__('Hours Worked') + ' *'"
              label-placement="stacked"
              v-model="hoursInput"
              placeholder="e.g. 2.5"
              class="custom-ion-input"
            />
            <p v-if="hoursError" class="mt-1 text-xs text-red-500 font-medium px-1">{{ hoursError }}</p>
          </div>
          <div class="flex gap-2">
            <ion-button
              fill="outline"
              color="medium"
              class="flex-1"
              @click="showHoursPanel = false; hoursInput = ''; hoursError = ''"
            >
              {{ __('Cancel') }}
            </ion-button>
            <ion-button
              color="success"
              class="flex-1"
              :disabled="acting"
              @click="confirmFinishRepair"
            >
              <ion-spinner v-if="acting" name="crescent" />
              <span v-else>{{ __('Confirm') }}</span>
            </ion-button>
          </div>
        </div>

        <!-- Action error -->
        <p v-if="actionError" class="text-sm text-red-600 text-center">{{ actionError }}</p>

        <!-- Status action buttons (New / Programmed / Released — outside footer) -->
        <div v-if="!isEditable && !isLocked" class="space-y-3">
          <ion-button
            v-if="['New', 'Programmed'].includes(swo.status)"
            expand="block"
            color="warning"
            class="action-btn"
            :disabled="acting"
            @click="act('Repairing')"
          >
            <ion-spinner v-if="acting" name="crescent" />
            <span v-else>{{ __('Start Repair') }}</span>
          </ion-button>
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
      class="ion-no-border"
      v-if="swo && (isEditable || swo.status === 'Staged')"
    >
      <div class="px-4 py-3 border-t border-slate-100 bg-white">

        <!-- Editable footer (Repairing / Partial Repair) -->
        <div v-if="isEditable && !showHoursPanel" class="space-y-2">
          <!-- Save (primary, Navy Blue) -->
          <ion-button
            expand="block"
            color="dark"
            class="action-btn"
            :disabled="saving || acting"
            @click="saveChanges"
          >
            <ion-spinner v-if="saving" name="crescent" />
            <template v-else>
              <div class="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                {{ __('Save') }}
              </div>
            </template>
          </ion-button>

          <!-- Second row: Pause/Resume + Finish -->
          <div class="grid grid-cols-2 gap-2">
            <!-- Pause Repair (Amber) -->
            <ion-button
              v-if="swo.status === 'Repairing'"
              color="warning"
              class="flex-1 action-btn-small"
              :disabled="saving || acting"
              @click="act('Partial Repair')"
            >
              <div class="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="10" y1="15" x2="10" y2="9"/>
                  <line x1="14" y1="15" x2="14" y2="9"/>
                </svg>
                {{ __('Pause') }}
              </div>
            </ion-button>

            <!-- Resume -->
            <ion-button
              v-else-if="swo.status === 'Partial Repair'"
              fill="outline"
              color="dark"
              class="flex-1 action-btn-small"
              :disabled="saving || acting"
              @click="act('Repairing')"
            >
              <div class="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                {{ __('Resume') }}
              </div>
            </ion-button>

            <!-- Finish Repair (Emerald) -->
            <ion-button
              color="success"
              class="flex-1 action-btn-small"
              :disabled="saving || acting"
              @click="onFinishRepair"
            >
              <div class="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {{ __('Finish') }}
              </div>
            </ion-button>
          </div>
        </div>

        <!-- Staged footer: signature actions -->
        <div v-else-if="swo.status === 'Staged'" class="space-y-2">
          <template v-if="!swo.signature_link">
          <ion-button
            expand="block"
            color="dark"
            class="action-btn"
            :disabled="acting"
            @click="onGenerateLink"
          >
            <ion-spinner v-if="acting" name="crescent" />
            <div v-else class="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>{{__("Generate Signature Link")}}</span>
            </div>
          </ion-button>
          <ion-button
            expand="block"
            fill="outline"
            color="danger"
            class="action-btn"
            :disabled="acting"
            @click="onSkipSignature"
          >
            <div class="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {{__("Skip Signature & Attach")}}
            </div>
          </ion-button>
          </template>

          <template v-else>
          <ion-button
            expand="block"
            color="dark"
            class="action-btn"
            @click="openSignatureLink"
          >
            <div class="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {{ __('Open Signature Link') }}
            </div>
          </ion-button>
            <div class="grid grid-cols-2 gap-2">
            <ion-button
              fill="outline"
              color="danger"
              class="flex-1 action-btn-small"
              :disabled="acting"
              @click="onSkipSignature"
            >
              {{ __('Skip & Attach') }}
            </ion-button>
            <ion-button
              fill="outline"
              color="dark"
              class="flex-1 action-btn-small"
              @click="copySignatureLink"
            >
              <div class="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {{ __('Copy Link') }}
              </div>
            </ion-button>
            </div>
          <ion-button
            expand="block"
            fill="clear"
            color="dark"
            size="small"
            class="action-btn text-[11px]"
            :disabled="acting"
            @click="onGenerateLink"
          >
            {{ __('Regenerate Link') }}
          </ion-button>
          </template>
          <input type="file" ref="skipFileInput" class="hidden" accept="image/*" capture="environment" @change="onPaperFilePicked" />
        </div>

      </div>
    </ion-footer>

  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonContent, IonFooter,
  IonButton, IonInput, IonTextarea, IonToggle, IonSpinner
} from '@ionic/vue'
import {
  getSWO, updateSWO, updateSWOStatus, searchItems, generateSignatureLink,
  skipSignatureMobile,
  checkResponsibleUser,
  type ServiceWorkOrderDetail, type SWOItem, type ItemResult,
} from '@/services/api'
import { session } from '@/data/session'
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
const WORK_SECTION_STATUSES = [...EDITABLE_STATUSES, 'Staged', 'Completed', 'Billed', 'Issued', 'Closed']

const isEditable       = computed(() => EDITABLE_STATUSES.includes(swo.value?.status ?? ''))
const isLocked         = computed(() => ['Staged', 'Completed', 'Billed', 'Issued', 'Closed', 'Cancelled'].includes(swo.value?.status ?? ''))
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
    console.log('SWO Loaded:', swo.value)
    // Diagnostic alert for the user
    if (swo.value.status === 'Staged') {
      console.log('Rendering Signature Buttons. Acting state:', acting.value)
    }
  } catch (err) {
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
    // Security: verify the current user is still the responsible technician
    const isStillResponsible = await checkResponsibleUser(docName, session.user ?? '')
    if (!isStillResponsible) {
      actionError.value = __('This order has been reassigned. Please reload your list before acting.')
      return
    }
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
    // Security: verify the current user is still the responsible technician
    const isStillResponsible = await checkResponsibleUser(docName, session.user ?? '')
    if (!isStillResponsible) {
      actionError.value = __('This order has been reassigned. Please reload your list before acting.')
      return
    }
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
// ─── Signature Flow ──────────────────────────────────────────────────────────

const skipFileInput = ref<HTMLInputElement | null>(null)

function onSkipSignature() {
  skipFileInput.value?.click()
}

function onPaperFilePicked(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (ev) => {
    const base64 = ev.target?.result as string
    
    // Confirm skip
    if (!confirm(__('Are you sure you want to skip the digital signature and attach this paper report?'))) {
      if (skipFileInput.value) skipFileInput.value.value = ''
      return
    }

    acting.value = true
    try {
      await skipSignatureMobile(swo.value!.name, base64)
      await loadSWO()
    } catch (err: any) {
      alert(err.message || __('Failed to skip signature'))
    } finally {
      acting.value = false
    }
  }
  reader.readAsDataURL(file)
}

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
    Repairing:       'bg-amber-100 text-amber-800',
    'Partial Repair':'bg-amber-100 text-amber-800',
    Staged:          'bg-blue-100 text-blue-800',
    Completed:       'bg-emerald-100 text-emerald-800',
    Billed:          'bg-emerald-100 text-emerald-800',
    Issued:          'bg-emerald-100 text-emerald-800',
    Closed:          'bg-emerald-100 text-emerald-800',
    Cancelled:       'bg-red-100 text-red-600',
  }
  return map[s] ?? 'bg-slate-100 text-slate-600'
}
</script>

<style scoped>
.header-btn {
  --color: #334155;
  --background: transparent;
  width: 36px;
  height: 36px;
  margin: 0;
}

.custom-ion-input {
  --background: #ffffff;
  --border-color: #e2e8f0;
  --border-radius: 8px;
  --padding-start: 12px;
  margin-bottom: 4px;
}

.remove-btn {
  margin: 0;
  --padding-start: 4px;
  --padding-end: 4px;
}

.action-btn {
  --border-radius: 10px;
  --height: 48px;
  margin: 0;
  font-weight: 600;
}

.action-btn-small {
  --border-radius: 10px;
  --height: 44px;
  margin: 0;
  font-weight: 600;
}
</style>
