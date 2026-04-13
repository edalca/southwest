<template>
  <ion-page>

    <ion-header class="ion-no-border">
      <div class="flex items-center gap-1 bg-white px-2 py-3 border-b border-slate-100">
        <button
          class="flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 active:bg-slate-100 transition-colors"
          @click="router.back()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 class="text-xl font-bold text-gray-900">{{ __('New Work Order') }}</h2>
      </div>
    </ion-header>

    <ion-content style="--background: #f8fafc;">

      <!-- Loading -->
      <div v-if="initialLoading" class="flex min-h-[60vh] items-center justify-center">
        <span class="w-7 h-7 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin block" />
      </div>

      <div v-else class="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">

        <!-- ── Section 1: Order Details ──────────────────────────────────── -->
        <div>
          <p class="section-label">{{ __('Order Details') }}</p>
          <div class="form-card">

            <!-- Customer -->
            <div class="form-field">
              <label class="form-label">{{ __('Customer') }} <span class="text-red-500">*</span></label>
              <div class="select-wrap">
                <select class="form-select" v-model="form.customer" @change="onCustomerChange">
                  <option value="" disabled>{{ __('Select customer') }}</option>
                  <option v-for="c in customers" :key="c.name" :value="c.name">
                    {{ c.customer_name }}
                  </option>
                </select>
                <svg class="select-arrow" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <div class="form-divider" />

            <!-- Scheduled Date -->
            <div class="form-field">
              <label class="form-label">{{ __('Scheduled Date') }} <span class="text-red-500">*</span></label>
              <input
                class="form-input"
                type="date"
                v-model="form.scheduled_date"
                @change="onDateChange"
              />
            </div>

            <div class="form-divider" />

            <!-- Service Type -->
            <div class="form-field">
              <label class="form-label">{{ __('Service Type') }} <span class="text-red-500">*</span></label>
              <div class="select-wrap">
                <select class="form-select" v-model="form.service_type" @change="onServiceTypeChange">
                  <option value="" disabled>{{ __('Select type') }}</option>
                  <option v-for="t in serviceTypeOptions" :key="t.value" :value="t.value">
                    {{ t.label }}
                  </option>
                </select>
                <svg class="select-arrow" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Section 2: Equipment ──────────────────────────────────────── -->
        <div>
          <p class="section-label">{{ __('Equipment') }} <span class="text-red-500">*</span></p>

          <!-- Misc: checkbox list -->
          <template v-if="isMisc">
            <div
              v-if="loadingEquipment"
              class="form-card flex items-center gap-2 text-sm text-slate-400 py-4 justify-center"
            >
              <span class="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin block" />
              {{ __('Loading equipment...') }}
            </div>
            <p v-else-if="equipmentError" class="text-sm text-red-500 pl-1">
              {{ __('Could not load equipment — check connection and try again') }}
            </p>
            <p v-else-if="!form.service_type || !form.customer" class="text-sm text-slate-400 pl-1">
              {{ !form.service_type ? __('Select a service type first') : __('Select a customer first') }}
            </p>
            <p v-else-if="equipment.length === 0" class="text-sm text-amber-600 pl-1">
              {{ __('No active equipment found for this customer on the selected date') }}
            </p>
            <div v-else class="form-card space-y-1 py-2">
              <label
                v-for="e in equipment"
                :key="e.name"
                class="flex items-center gap-3 px-1 py-2 cursor-pointer rounded-lg active:bg-slate-50"
              >
                <input
                  type="checkbox"
                  :value="e.name"
                  v-model="form.equipment_selection"
                  class="w-5 h-5 rounded-md border-slate-300 accent-gray-900 flex-shrink-0"
                />
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ e.customer_unit_id_number }}</p>
                  <p class="text-xs text-slate-400">{{ e.name }}</p>
                </div>
              </label>
            </div>
          </template>

          <!-- Single select -->
          <template v-else>
            <div class="form-card">
              <div class="form-field">
                <div class="select-wrap">
                  <select
                    class="form-select"
                    v-model="singleEquipment"
                    :disabled="equipmentDisabled"
                  >
                    <option value="">{{ equipmentPlaceholder }}</option>
                    <option v-for="e in equipment" :key="e.name" :value="e.name">
                      {{ e.customer_unit_id_number }} — {{ e.name }}
                    </option>
                  </select>
                  <svg class="select-arrow" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>
            <p v-if="loadingEquipment" class="mt-1 text-xs text-slate-400 pl-1">
              {{ __('Loading equipment...') }}
            </p>
            <p v-else-if="equipmentError" class="mt-1 text-xs text-red-500 pl-1">
              {{ __('Could not load equipment — check connection and try again') }}
            </p>
            <p v-else-if="!form.service_type" class="mt-1 text-xs text-slate-400 pl-1">
              {{ __('Select a service type first') }}
            </p>
            <p v-else-if="!form.customer" class="mt-1 text-xs text-slate-400 pl-1">
              {{ __('Select a customer first') }}
            </p>
            <p v-else-if="equipment.length === 0 && form.customer" class="mt-1 text-xs text-amber-600 pl-1">
              {{ __('No active equipment found for this customer on the selected date') }}
            </p>
          </template>
        </div>

        <!-- ── Section 3: Additional Info ────────────────────────────────── -->
        <div>
          <p class="section-label">{{ __('Additional Info') }}</p>
          <div class="form-card">

            <div class="form-field">
              <label class="form-label">{{ __('Hour Meter') }}</label>
              <input
                class="form-input"
                type="text"
                inputmode="numeric"
                :placeholder="__('e.g. 1234')"
                v-model="form.hour_meter"
              />
            </div>

            <div class="form-divider" />

            <div class="form-field">
              <label class="form-label">{{ __('PO Number') }}</label>
              <input
                class="form-input"
                type="text"
                :placeholder="__('Customer purchase order')"
                v-model="form.po_number"
              />
            </div>

          </div>
        </div>

        <!-- Validation error -->
        <p v-if="errorMsg" class="text-sm text-red-600 pl-1">{{ errorMsg }}</p>

        <!-- Submit -->
        <button
          class="submit-btn"
          :disabled="submitting"
          @click="handleSubmit"
        >
          <span
            v-if="submitting"
            class="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"
          />
          <span v-else>{{ __('Create Work Order') }}</span>
        </button>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonContent } from '@ionic/vue'
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
  po_number:  '',
})

// ── Computed ──────────────────────────────────────────────────────────────────
const isMisc = computed(() => form.value.service_type === 'Misc')

const serviceTypeOptions = [
  { label: 'PM Frequency', value: 'PM Frequency' },
  { label: 'Misc',         value: 'Misc' },
  { label: 'Labor Rate',   value: 'Labor Rate' },
]

const equipmentPlaceholder = computed(() =>
  equipmentDisabled.value ? __('Select customer & type first') : __('Select equipment')
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

async function onDateChange() {
  form.value.equipment_selection = []
  singleEquipment.value = ''
  equipment.value = []
  equipmentError.value = false
  if (form.value.customer && form.value.scheduled_date) await fetchEquipment()
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
    form.value.equipment_selection = singleEquipment.value ? [singleEquipment.value] : []
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
      hour_meter:          form.value.hour_meter         || undefined,
      po_number:  form.value.po_number || undefined,
    })
    await router.replace('/tabs/orders')
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

<style scoped>
/* ── Typography ─────────────────────────────────────────────────────────────── */
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;       /* slate-400 */
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
  padding-left: 4px;
}

/* ── Card container ─────────────────────────────────────────────────────────── */
.form-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  overflow: hidden;
}

.form-divider {
  height: 1px;
  background: #f1f5f9;  /* slate-100 */
  margin: 0 16px;
}

/* ── Field row ──────────────────────────────────────────────────────────────── */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;       /* slate-500 */
  letter-spacing: 0.01em;
}

/* ── Inputs ─────────────────────────────────────────────────────────────────── */
.form-input,
.form-select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 16px;      /* prevents iOS auto-zoom */
  font-weight: 500;
  color: #111827;       /* gray-900 */
  background: transparent;
  border: none;
  outline: none;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}

.form-input::placeholder {
  color: #cbd5e1;       /* slate-300 */
  font-weight: 400;
}

/* ── Custom select wrapper (for arrow icon) ─────────────────────────────────── */
.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.select-wrap .form-select {
  padding-right: 32px;
  cursor: pointer;
}

.select-arrow {
  position: absolute;
  right: 0;
  width: 16px;
  height: 16px;
  color: #94a3b8;       /* slate-400 */
  pointer-events: none;
  flex-shrink: 0;
}

.form-select:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

/* ── Submit ─────────────────────────────────────────────────────────────────── */
.submit-btn {
  width: 100%;
  height: 52px;
  background: #111827;
  color: #ffffff;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.01em;
  transition: background 0.15s, opacity 0.15s;
}

.submit-btn:active {
  background: #374151;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
