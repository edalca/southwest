<template>
  <ion-page>

    <!-- Header -->
    <ion-header class="ion-no-border">
      <div class="flex items-center gap-2 bg-white px-2 py-3 shadow-sm">
        <Button variant="ghost" class="!px-2" @click="router.back()">
          <FeatherIcon name="chevron-left" class="h-5 w-5" />
        </Button>
        <h2 class="text-xl font-semibold text-gray-900">{{ __('New Work Order') }}</h2>
      </div>
    </ion-header>

    <ion-content>

      <!-- Loading overlay -->
      <div v-if="initialLoading" class="flex min-h-[60vh] items-center justify-center">
        <LoadingIndicator class="h-8 w-8 text-gray-400" />
      </div>

      <div v-else class="mx-auto max-w-lg space-y-4 p-4 pb-10">

        <div class="rounded-xl bg-white p-4 shadow-sm space-y-4">
          <!-- Customer -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              {{ __('Customer') }} <span class="text-red-500">*</span>
            </label>
            <Select
              v-model="form.customer"
              :placeholder="__('Select customer')"
              :options="customerOptions"
              @change="onCustomerChange"
            />
          </div>

          <!-- Scheduled Date -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              {{ __('Scheduled Date') }} <span class="text-red-500">*</span>
            </label>
            <DatePicker
              v-model="form.scheduled_date"
              :placeholder="__('Select date')"
              @change="onDateChange"
            />
          </div>

          <!-- Service Type -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              {{ __('Service Type') }} <span class="text-red-500">*</span>
            </label>
            <Select
              v-model="form.service_type"
              :placeholder="__('Select type')"
              :options="serviceTypeOptions"
              @change="onServiceTypeChange"
            />
          </div>

          <!-- Equipment -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              {{ __('Equipment') }} <span class="text-red-500">*</span>
            </label>

            <!-- Misc: multiple checkboxes -->
            <template v-if="isMisc">
              <div
                v-if="loadingEquipment"
                class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
              >
                {{ __('Loading equipment...') }}
              </div>
              <div v-else-if="equipmentError" class="text-sm text-red-500">
                {{ __('Could not load equipment — check connection and try again') }}
              </div>
              <div v-else-if="!form.service_type || !form.customer" class="text-sm text-gray-400">
                {{ !form.service_type ? __('Select a service type first') : __('Select a customer first') }}
              </div>
              <div v-else-if="equipment.length === 0" class="text-sm text-yellow-600">
                {{ __('No active equipment found for this customer on the selected date') }}
              </div>
              <div v-else class="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label
                  v-for="e in equipment"
                  :key="e.name"
                  class="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    :value="e.name"
                    v-model="form.equipment_selection"
                    class="h-4 w-4 rounded border-gray-300 text-gray-900"
                  />
                  <span>{{ e.customer_unit_id_number }} — {{ e.make }} {{ e.model }}</span>
                </label>
              </div>
            </template>

            <!-- Single select -->
            <template v-else>
              <Select
                v-model="singleEquipment"
                :placeholder="equipmentPlaceholder"
                :disabled="equipmentDisabled"
                :options="equipmentOptions"
              />
              <p v-if="!form.service_type" class="mt-1 text-xs text-gray-400">
                {{ __('Select a service type first') }}
              </p>
              <p v-else-if="!form.customer" class="mt-1 text-xs text-gray-400">
                {{ __('Select a customer first') }}
              </p>
              <p v-else-if="loadingEquipment" class="mt-1 text-xs text-gray-400">
                {{ __('Loading equipment...') }}
              </p>
              <p v-else-if="equipmentError" class="mt-1 text-xs text-red-500">
                {{ __('Could not load equipment — check connection and try again') }}
              </p>
              <p v-else-if="equipment.length === 0 && form.customer" class="mt-1 text-xs text-yellow-600">
                {{ __('No active equipment found for this customer on the selected date') }}
              </p>
            </template>
          </div>

          <!-- Hour Meter -->
          <FormControl
            type="text"
            :label="__('Hour Meter')"
            :placeholder="__('e.g. 1234')"
            v-model="form.hour_meter"
            inputmode="numeric"
          />

          <!-- PO Number -->
          <FormControl
            type="text"
            :label="__('PO Number')"
            :placeholder="__('Customer purchase order')"
            v-model="form.customer_po_number"
          />

          <!-- Validation error -->
          <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        </div>

        <!-- Submit -->
        <Button
          variant="solid"
          class="w-full"
          :loading="submitting"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ __('Create Work Order') }}
        </Button>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonContent } from '@ionic/vue'
import { Button, FormControl, FeatherIcon, Select, DatePicker, LoadingIndicator } from 'frappe-ui'
import {
  getCustomers, getCompanies, getCustomerEquipment, createSWO,
  type Customer, type Equipment, type Company,
} from '@/services/api'

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── State ─────────────────────────────────────────────────────────────────────
const customers        = ref<Customer[]>([])
const equipment        = ref<Equipment[]>([])
const companies        = ref<Company[]>([])
const initialLoading   = ref(true)
const loadingEquipment = ref(false)
const equipmentError   = ref(false)
const submitting       = ref(false)
const errorMsg         = ref('')
const singleEquipment  = ref('')

const form = ref({
  customer:            '',
  scheduled_date:      todayISO(),
  service_type:        '',
  equipment_selection: [] as string[],
  hour_meter:          '',
  customer_po_number:  '',
})

// ── Computed ──────────────────────────────────────────────────────────────────
const isMisc = computed(() => form.value.service_type === 'Misc')

const customerOptions = computed(() =>
  customers.value.map((c) => ({ label: c.customer_name, value: c.name }))
)

const serviceTypeOptions = [
  { label: 'PM Frequency', value: 'PM Frequency' },
  { label: 'Misc',          value: 'Misc' },
  { label: 'Labor Rate',    value: 'Labor Rate' },
]

const equipmentOptions = computed(() =>
  equipment.value.map((e) => ({
    label: `${e.customer_unit_id_number} — ${e.make} ${e.model}`,
    value: e.name,
  }))
)

const equipmentPlaceholder = computed(() =>
  isMisc.value ? __('Select one or more units') : __('Select equipment')
)

const equipmentDisabled = computed(() =>
  !form.value.service_type ||
  !form.value.customer ||
  loadingEquipment.value ||
  equipment.value.length === 0
)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [c, co] = await Promise.all([getCustomers(), getCompanies()])
    customers.value = c
    companies.value = co
  } finally {
    initialLoading.value = false
  }
})

// ── Handlers ──────────────────────────────────────────────────────────────────
function onServiceTypeChange() {
  form.value.equipment_selection = []
  singleEquipment.value = ''
}

async function onCustomerChange() {
  form.value.equipment_selection = []
  singleEquipment.value = ''
  equipment.value = []
  equipmentError.value = false
  if (form.value.customer) await fetchEquipment()
}

async function onDateChange(val: string) {
  form.value.scheduled_date = val ?? todayISO()
  form.value.equipment_selection = []
  singleEquipment.value = ''
  equipment.value = []
  equipmentError.value = false
  if (form.value.customer && form.value.scheduled_date) await fetchEquipment()
}

function onSingleEquipmentChange(val: string) {
  form.value.equipment_selection = val ? [val] : []
}

async function fetchEquipment() {
  loadingEquipment.value = true
  equipmentError.value = false
  try {
    equipment.value = await getCustomerEquipment(form.value.customer, form.value.scheduled_date)
  } catch {
    equipment.value = []
    equipmentError.value = true
  } finally {
    loadingEquipment.value = false
  }
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  errorMsg.value = ''
  
  if (!isMisc.value) {
    let v = singleEquipment.value as unknown
    if (v && typeof v === 'object' && 'value' in v) {
      v = (v as { value: string }).value
    }
    form.value.equipment_selection = v ? [v as string] : []
  }

  if (!form.value.customer)                        { errorMsg.value = __('Customer is required.');       return }
  if (!form.value.scheduled_date)                  { errorMsg.value = __('Scheduled date is required.'); return }
  if (!form.value.service_type)                    { errorMsg.value = __('Service type is required.');   return }
  if (form.value.equipment_selection.length === 0) { errorMsg.value = __('Equipment is required.');      return }

  const company = companies.value[0]?.name ?? ''
  if (!company) { errorMsg.value = __('No company configured in the system.'); return }

  submitting.value = true
  try {
    await createSWO({
      customer:            form.value.customer,
      company,
      service_type:        form.value.service_type,
      scheduled_date:      form.value.scheduled_date,
      equipment_selection: form.value.equipment_selection.map((e) => ({ equipment: e })),
      hour_meter:          form.value.hour_meter          || undefined,
      customer_po_number:  form.value.customer_po_number  || undefined,
    })
    await router.replace('/swo')
  } catch (err: unknown) {
    const e = err as { _error_message?: string; message?: string }
    errorMsg.value =
      e?._error_message ??
      e?.message ??
      __('Failed to create the work order. Please try again.')
  } finally {
    submitting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
</script>
