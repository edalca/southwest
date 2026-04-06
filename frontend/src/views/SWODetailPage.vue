<template>
  <ion-page>

    <!-- Header -->
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between bg-white px-2 py-3 shadow-sm">
        <div class="flex items-center gap-1">
          <Button variant="ghost" class="!px-2" @click="router.back()">
            <FeatherIcon name="chevron-left" class="h-5 w-5" />
          </Button>
          <h2 class="text-lg font-semibold text-gray-900">
            {{ swo ? (swo.work_order_number || swo.name) : '...' }}
          </h2>
        </div>
        <Button variant="ghost" class="!px-2" :title="__('Refresh')" @click="loadSWO">
          <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        </Button>
      </div>
    </ion-header>

    <ion-content>

      <!-- Loading -->
      <div v-if="loading" class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-400">
        <LoadingIndicator class="h-8 w-8" />
      </div>

      <!-- Load error -->
      <div v-else-if="!swo" class="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center text-gray-500">
        <FeatherIcon name="alert-circle" class="h-12 w-12 text-red-400" />
        <p>{{ loadError }}</p>
        <Button variant="outline" @click="loadSWO">{{ __('Retry') }}</Button>
      </div>

      <div v-else class="space-y-4 p-4 pb-10">

        <!-- Status badge -->
        <div class="flex justify-center">
          <Badge :label="__(swo.status)" :theme="statusTheme(swo.status)" size="lg" />
        </div>

        <!-- Info card -->
        <div class="rounded-xl bg-white p-4 shadow-sm space-y-2">
          <InfoRow :label="__('Customer')" :value="swo.customer" />
          <InfoRow :label="__('Service Type')" :value="__(swo.service_type)" />
          <InfoRow :label="__('Scheduled Date')" :value="formatDate(swo.scheduled_date)" />
          <InfoRow v-if="swo.hour_meter" :label="__('Hour Meter')" :value="swo.hour_meter" />
          <InfoRow v-if="swo.customer_po_number" :label="__('PO Number')" :value="swo.customer_po_number" />
        </div>

        <!-- Equipment -->
        <div v-if="swo.equipment_selection?.length" class="rounded-xl bg-white p-4 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ __('Equipment') }}</p>
          <div
            v-for="row in swo.equipment_selection"
            :key="row.name"
            class="flex items-center gap-2 py-1 text-sm text-gray-700"
          >
            <FeatherIcon name="tool" class="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span>{{ row.equipment }}</span>
          </div>
        </div>

        <!-- Work sections (items + docs) -->
        <template v-if="showWorkSections">

          <!-- Parts / Items -->
          <div class="rounded-xl bg-white shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p class="text-sm font-semibold text-gray-700">{{ __('Parts / Items') }}</p>
              <Button v-if="isEditable" variant="ghost" size="sm" @click="openAddItemModal">
                <FeatherIcon name="plus-circle" class="h-4 w-4 mr-1" />
                {{ __('Add') }}
              </Button>
            </div>
            <div class="px-4 py-3">
              <p v-if="localItems.length === 0" class="text-center text-sm text-gray-400 py-2">
                {{ __('No items added yet.') }}
              </p>
              <div
                v-for="(item, idx) in localItems"
                :key="idx"
                class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div class="flex flex-col gap-0.5 flex-1">
                  <span class="text-sm font-semibold text-gray-800">
                    {{ item.item_code || item.part_number || '—' }}
                  </span>
                  <span class="text-xs text-gray-500">
                    {{ item.description }}
                    <span v-if="item.vendor"> · {{ item.vendor }}</span>
                  </span>
                  <span class="text-xs text-gray-400">{{ __('Qty') }}: {{ item.qty }}</span>
                </div>
                <Button v-if="isEditable" variant="ghost" @click="removeItem(idx)">
                  <FeatherIcon name="trash-2" class="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          </div>

          <!-- Documentation -->
          <div class="rounded-xl bg-white p-4 shadow-sm space-y-3">
            <p class="text-sm font-semibold text-gray-700">{{ __('Documentation') }}</p>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-500">{{ __('Problem With Lift') }}</label>
              <Textarea
                v-model="localDocs.problem_with_lift"
                :placeholder="isEditable ? __('Describe the reported problem...') : '—'"
                :disabled="!isEditable"
                :rows="3"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-500">{{ __('Repair Description') }}</label>
              <Textarea
                v-model="localDocs.repair_description"
                :placeholder="isEditable ? __('Describe the work performed...') : '—'"
                :disabled="!isEditable"
                :rows="3"
              />
            </div>
          </div>



        </template>

        <!-- Action error -->
        <p v-if="actionError" class="text-sm text-red-600">{{ actionError }}</p>

        <!-- Status action buttons -->
        <div class="space-y-3">

          <Button
            v-if="['New', 'Programmed'].includes(swo.status)"
            variant="solid"
            class="w-full"
            :loading="acting"
            @click="act('Released')"
          >
            {{ __('Release') }}
          </Button>

          <Button
            v-if="swo.status === 'Released'"
            variant="solid"
            class="w-full !bg-yellow-500 hover:!bg-yellow-600"
            :loading="acting"
            @click="act('Repairing')"
          >
            {{ __('Start Repair') }}
          </Button>





          <div
            v-if="['Completed', 'Invoiced', 'Cancelled'].includes(swo.status)"
            class="flex items-center justify-center gap-2 py-4 text-sm text-gray-400"
          >
            <FeatherIcon name="lock" class="h-4 w-4" />
            {{ __('This work order is locked for editing.') }}
          </div>

        </div>
      </div>

    </ion-content>

    <ion-footer class="ion-no-border bg-white" v-if="swo && (isEditable || swo.status === 'Staged')">
      <div class="px-4 py-3 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)] bg-white">
        
        <!-- Editable Actions -->
        <div v-if="isEditable" class="flex w-full items-stretch rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
          
          <!-- Save (2/5) -->
          <button
            class="flex-[2] flex flex-col items-center justify-center py-2 border-r border-gray-200 bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-50"
            :disabled="saving || acting"
            @click="saveChanges"
          >
            <LoadingIndicator v-if="saving" class="h-5 w-5 mb-1 text-white" />
            <FeatherIcon v-else name="save" class="h-5 w-5 mb-1 text-white" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-gray-100">{{ __('Save') }}</span>
          </button>

          <!-- Pause/Resume (1/5) -->
          <button
            v-if="swo.status === 'Repairing'"
            class="flex-[1] flex flex-col items-center justify-center py-2 border-r border-gray-200 text-orange-600 hover:bg-orange-50 active:bg-orange-100 transition-colors disabled:opacity-50"
            :disabled="saving || acting"
            @click="act('Partial Repair')"
          >
            <LoadingIndicator v-if="acting" class="h-5 w-5 mb-1 text-orange-400" />
            <FeatherIcon v-else name="pause-circle" class="h-5 w-5 mb-1 text-orange-500" />
            <span class="text-[10px] font-bold uppercase tracking-widest">{{ __('Pause') }}</span>
          </button>
          
          <button
            v-if="swo.status === 'Partial Repair'"
            class="flex-[1] flex flex-col items-center justify-center py-2 border-r border-gray-200 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-50"
            :disabled="saving || acting"
            @click="act('Repairing')"
          >
            <LoadingIndicator v-if="acting" class="h-5 w-5 mb-1 text-blue-400" />
            <FeatherIcon v-else name="play-circle" class="h-5 w-5 mb-1 text-blue-500" />
            <span class="text-[10px] font-bold uppercase tracking-widest">{{ __('Resume') }}</span>
          </button>

          <!-- Finish Repair (2/5) -->
          <button
            class="flex-[2] flex flex-col items-center justify-center py-2 bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50"
            :disabled="saving || acting"
            @click="onFinishRepair"
          >
            <LoadingIndicator v-if="acting" class="h-5 w-5 mb-1 text-white" />
            <FeatherIcon v-else name="check-circle" class="h-5 w-5 mb-1 text-white" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-green-50">{{ __('Finish') }}</span>
          </button>

        </div>

        <!-- Staged Actions -->
        <div v-else-if="swo.status === 'Staged'" class="flex w-full items-stretch rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
          
          <template v-if="!swo.signature_link">
            <!-- Generate Link -->
            <button
              class="flex-1 flex flex-col items-center justify-center py-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
              :disabled="acting"
              @click="onGenerateLink"
            >
              <LoadingIndicator v-if="acting" class="h-5 w-5 mb-1 text-white" />
              <FeatherIcon v-else name="link" class="h-5 w-5 mb-1 text-white" />
              <span class="text-[10px] font-bold uppercase tracking-widest text-blue-50">{{ __('Generate Link') }}</span>
            </button>
          </template>

          <template v-else>
            <!-- Open Link -->
            <button
              class="flex-[2] flex flex-col items-center justify-center py-2 border-r border-gray-200 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
              @click="openSignatureLink"
            >
              <FeatherIcon name="external-link" class="h-5 w-5 mb-1 text-white" />
              <span class="text-[10px] font-bold uppercase tracking-widest text-blue-50">{{ __('Open Link') }}</span>
            </button>

            <!-- Copy Link -->
            <button
              class="flex-[2] flex flex-col items-center justify-center py-2 border-r border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              @click="copySignatureLink"
            >
              <FeatherIcon name="copy" class="h-5 w-5 mb-1 text-gray-500" />
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-600">{{ __('Copy') }}</span>
            </button>

            <!-- Regenerate Link -->
            <button
              class="flex-[1] flex flex-col items-center justify-center py-2 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
              :disabled="acting"
              @click="onGenerateLink"
            >
              <LoadingIndicator v-if="acting" class="h-5 w-5 mb-1 text-red-400" />
              <FeatherIcon v-else name="refresh-cw" class="h-5 w-5 mb-1 text-red-500" />
              <span class="text-[10px] font-bold uppercase tracking-widest">{{ __('Re-gen') }}</span>
            </button>
          </template>

        </div>
      </div>
    </ion-footer>

    <!-- ── Hours dialog (for Finish Repair on Labor Rate / Misc) ── -->
    <Dialog v-model="showHoursDialog" :options="{ title: __('Finish Repair') }">
      <template #body-content>
        <p class="mb-3 text-sm text-gray-600">
          {{ __('Enter the total hours worked for this service.') }}
        </p>
        <FormControl
          type="number"
          :label="__('Hours Worked')"
          placeholder="e.g. 2.5"
          v-model="hoursInput"
          step="0.1"
          min="0.1"
        />
        <p v-if="hoursError" class="mt-1 text-sm text-red-600">{{ hoursError }}</p>
      </template>
      <template #actions>
        <Button variant="ghost" @click="showHoursDialog = false">{{ __('Cancel') }}</Button>
        <Button variant="solid" :loading="acting" @click="confirmFinishRepair">{{ __('Confirm') }}</Button>
      </template>
    </Dialog>

    <!-- ── Add Item dialog ───────────────────────────────────── -->
    <Dialog v-model="showAddItemModal" :options="{ title: __('Add Item') }">
      <template #body-content>
        <div class="space-y-3">

          <!-- Non-inventory toggle -->
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">{{ __('Non-inventory part') }}</span>
            <Switch v-model="newItem.is_non_inventory" />
          </div>

          <!-- Inventory item search -->
          <template v-if="!newItem.is_non_inventory">
            <div class="relative">
              <FormControl
                type="text"
                :label="__('Item Code') + ' *'"
                :placeholder="__('Type to search...')"
                v-model="newItem.item_code"
                @input="onItemSearch"
              />
              <div
                v-if="itemSearchResults.length"
                class="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                <button
                  v-for="r in itemSearchResults"
                  :key="r.name"
                  class="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  @click="selectItemResult(r)"
                >
                  <span class="text-sm font-semibold text-gray-800">{{ r.name }}</span>
                  <span class="text-xs text-gray-500">{{ r.item_name }}</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Non-inventory: part number -->
          <FormControl
            v-if="newItem.is_non_inventory"
            type="text"
            :label="__('Part Number')"
            placeholder="e.g. ABC-001"
            v-model="newItem.part_number"
          />

          <FormControl
            type="text"
            :label="__('Description')"
            :placeholder="__('Part description')"
            v-model="newItem.description"
          />

          <FormControl
            type="number"
            :label="__('Qty') + ' *'"
            placeholder="1"
            v-model="newItem.qty"
            step="0.01"
            min="0.01"
          />

          <FormControl
            type="text"
            :label="__('Vendor')"
            :placeholder="__('Optional')"
            v-model="newItem.vendor"
          />

          <p v-if="itemModalError" class="text-sm text-red-600">{{ itemModalError }}</p>
        </div>
      </template>
      <template #actions>
        <Button variant="ghost" @click="closeItemModal">{{ __('Cancel') }}</Button>
        <Button variant="solid" @click="confirmAddItem">{{ __('Add') }}</Button>
      </template>
    </Dialog>

  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, defineComponent, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonHeader, IonContent, IonFooter } from '@ionic/vue'
import {
  Button, Badge, FeatherIcon, LoadingIndicator, Dialog, FormControl,
  Textarea, Switch,
} from 'frappe-ui'
import {
  getSWO, updateSWO, updateSWOStatus, searchItems, generateSignatureLink,
  type ServiceWorkOrderDetail, type SWOItem, type ItemResult,
} from '@/services/api'
import { formatDate } from '@/utils/date'

// ── InfoRow helper component ───────────────────────────────────────────────
const InfoRow = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () => h('div', { class: 'flex justify-between py-1.5 border-b border-gray-50 last:border-0 gap-3' }, [
      h('span', { class: 'text-sm text-gray-500 flex-shrink-0' }, props.label),
      h('span', { class: 'text-sm font-medium text-gray-800 text-right' }, props.value ?? '—'),
    ])
  },
})

const route = useRoute()
const router = useRouter()
const docName = route.params.name as string
const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── State ─────────────────────────────────────────────────────────────────
const swo         = ref<ServiceWorkOrderDetail | null>(null)
const loading     = ref(false)
const loadError   = ref('')
const acting      = ref(false)
const saving      = ref(false)
const actionError = ref('')
const localItems  = ref<SWOItem[]>([])
const localDocs   = ref({ problem_with_lift: '', repair_description: '' })

// Hours dialog
const showHoursDialog = ref(false)
const hoursInput = ref('')
const hoursError = ref('')
let _pendingBasePayload: Record<string, unknown> = {}

// Add item dialog
const showAddItemModal   = ref(false)
const itemSearchResults  = ref<ItemResult[]>([])
const itemModalError     = ref('')
const newItem = ref(blankItem())

// ── Computed ──────────────────────────────────────────────────────────────
const EDITABLE_STATUSES     = ['Repairing', 'Partial Repair']
const WORK_SECTION_STATUSES = [...EDITABLE_STATUSES, 'Staged', 'Completed', 'Invoiced']

const isEditable       = computed(() => EDITABLE_STATUSES.includes(swo.value?.status ?? ''))
const showWorkSections = computed(() => WORK_SECTION_STATUSES.includes(swo.value?.status ?? ''))

// ── Watch ─────────────────────────────────────────────────────────────────
watch(swo, (doc) => {
  if (!doc) return
  localItems.value = (doc.service_items ?? []).map((i) => ({ ...i }))
  localDocs.value = {
    problem_with_lift:  doc.problem_with_lift  ?? '',
    repair_description: doc.repair_description ?? '',
  }
})

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(loadSWO)

async function loadSWO() {
  loading.value = true
  loadError.value = ''
  try {
    swo.value = await getSWO(docName)
  } catch {
    loadError.value = __('Could not load work order. Please try again.')
  } finally {
    loading.value = false
  }
}

// ── Save ──────────────────────────────────────────────────────────────────
async function saveChanges() {
  actionError.value = ''
  saving.value = true
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

// ── Status transitions ────────────────────────────────────────────────────
async function act(newStatus: string) {
  actionError.value = ''
  acting.value = true
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
    actionError.value = __('Problem with Equipment is required before finishing the repair.')
    return
  }
  if (!localDocs.value.repair_description.trim()) {
    actionError.value = __('Repair Description is required before finishing the repair.')
    return
  }

  _pendingBasePayload = {
    status:             'Staged',
    service_items:      localItems.value,
    problem_with_lift:  localDocs.value.problem_with_lift,
    repair_description: localDocs.value.repair_description,
  }

  if (!['Labor Rate', 'Misc'].includes(swo.value.service_type)) {
    acting.value = true
    try {
      await updateSWO(docName, _pendingBasePayload)
      await loadSWO()
    } catch (err) {
      actionError.value = extractError(err)
    } finally {
      acting.value = false
    }
    return
  }

  hoursInput.value = ''
  hoursError.value = ''
  showHoursDialog.value = true
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
    await updateSWO(docName, { ..._pendingBasePayload, hours_worked: hours })
    showHoursDialog.value = false
    await loadSWO()
  } catch (err) {
    actionError.value = extractError(err)
    showHoursDialog.value = false
  } finally {
    acting.value = false
  }
}

// ── Signature link ────────────────────────────────────────────────────────
async function onGenerateLink() {
  actionError.value = ''
  acting.value = true
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

// ── Item modal ────────────────────────────────────────────────────────────
function openAddItemModal() {
  newItem.value = blankItem()
  itemModalError.value = ''
  itemSearchResults.value = []
  showAddItemModal.value = true
}

function closeItemModal() {
  showAddItemModal.value = false
  itemSearchResults.value = []
}

let _searchTimer: ReturnType<typeof setTimeout> | null = null

function onItemSearch(event: Event) {
  const q = (event.target as HTMLInputElement).value ?? ''
  itemSearchResults.value = []
  if (_searchTimer) clearTimeout(_searchTimer)
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
  itemModalError.value = ''
  if (!newItem.value.is_non_inventory && !newItem.value.item_code) {
    itemModalError.value = __('Item code is required.')
    return
  }
  if (newItem.value.is_non_inventory && !newItem.value.part_number && !newItem.value.description) {
    itemModalError.value = __('Part number or description is required.')
    return
  }
  const parsedQty = parseFloat(String(newItem.value.qty))
  if (!parsedQty || parsedQty <= 0) {
    itemModalError.value = __('Qty must be greater than 0.')
    return
  }
  localItems.value.push({
    is_non_inventory_part: newItem.value.is_non_inventory ? 1 : 0,
    item_code:   newItem.value.is_non_inventory ? undefined : newItem.value.item_code || undefined,
    part_number: newItem.value.is_non_inventory ? newItem.value.part_number || undefined : undefined,
    description: newItem.value.description  || undefined,
    qty:         parsedQty,
    vendor:      newItem.value.vendor       || undefined,
  })
  closeItemModal()
}

function removeItem(idx: number) {
  localItems.value.splice(idx, 1)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function blankItem() {
  return { is_non_inventory: false, item_code: '', part_number: '', description: '', qty: '1', vendor: '' }
}

function extractError(err: unknown): string {
  const e = err as { _error_message?: string; message?: string }
  return e?._error_message ?? e?.message ?? __('Action failed. Please try again.')
}

function statusTheme(status: string): 'gray' | 'blue' | 'green' | 'orange' | 'red' {
  const map: Record<string, 'gray' | 'blue' | 'green' | 'orange' | 'red'> = {
    'New':            'gray',
    'Programmed':     'blue',
    'Released':       'blue',
    'Repairing':      'orange',
    'Partial Repair': 'orange',
    'Staged':         'blue',
    'Completed':      'green',
    'Invoiced':       'gray',
    'Cancelled':      'red',
  }
  return map[status] ?? 'gray'
}
</script>
