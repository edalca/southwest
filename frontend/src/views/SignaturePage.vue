<template>
  <ion-page>
    <ion-content :fullscreen="true" class="sig-content">

      <!-- Loading -->
      <div v-if="state === 'loading'" class="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-500">
        <LoadingIndicator class="h-8 w-8" />
        <p>{{ __('Loading...') }}</p>
      </div>

      <!-- Expired -->
      <div v-else-if="state === 'expired'" class="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center text-gray-500">
        <FeatherIcon name="link" class="h-16 w-16 text-gray-300" />
        <h3 class="text-xl font-semibold text-gray-700">{{ __('Link Expired') }}</h3>
        <p>{{ __('This signature link is no longer valid.') }}</p>
      </div>

      <!-- Already signed -->
      <div v-else-if="state === 'signed'" class="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center text-gray-500">
        <FeatherIcon name="check-circle" class="h-16 w-16 text-green-400" />
        <h3 class="text-xl font-semibold text-gray-700">{{ __('Already Signed') }}</h3>
        <p>{{ __('This work order has already been signed. Thank you!') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'done'" class="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center text-gray-500">
        <FeatherIcon name="check-circle" class="h-16 w-16 text-green-500" />
        <h2 class="text-2xl font-bold text-gray-800">{{ __('Thank You!') }}</h2>
        <p>{{ __('Your signature has been recorded successfully.') }}</p>
      </div>

      <!-- ── Document ──────────────────────────────────────────────────── -->
      <div v-else-if="state === 'ready' && data" class="doc-wrapper">
        <div class="doc-paper">

          <!-- Letterhead -->
          <header class="doc-header">
            <div class="doc-header-left">
              <img v-if="data.company_logo" :src="data.company_logo" class="doc-logo" alt="" />
            </div>
            <div class="doc-header-center">
              <p v-if="data.company_phone" class="doc-contact">{{ data.company_phone }}</p>
              <p v-if="data.company_email" class="doc-contact">{{ data.company_email }}</p>
            </div>
            <div class="doc-header-right">
              <span class="doc-company-name">{{ data.company_name }}</span>
            </div>
          </header>

          <hr class="doc-rule" />

          <!-- Title -->
          <div class="doc-title-row">
            <h1 class="doc-title">{{ __('Repair Order') }}</h1>
            <span class="doc-wo-number"># {{ data.work_order_number }}</span>
          </div>

          <!-- Info grid -->
          <div class="doc-info-grid">
            <div class="doc-info-cell">
              <span class="doc-info-label">{{ __('Customer') }}</span>
              <span class="doc-info-value">{{ data.customer }}</span>
            </div>
            <div class="doc-info-cell">
              <span class="doc-info-label">{{ __('Date') }}</span>
              <span class="doc-info-value">{{ formatDate(data.scheduled_date ?? '') }}</span>
            </div>
            <div class="doc-info-cell">
              <span class="doc-info-label">{{ __('Service Type') }}</span>
              <span class="doc-info-value">{{ __(data.service_type ?? '') }}</span>
            </div>
            <div class="doc-info-cell" v-if="data.customer_po_number">
              <span class="doc-info-label">{{ __('PO Number') }}</span>
              <span class="doc-info-value">{{ data.customer_po_number }}</span>
            </div>
            <div class="doc-info-cell" v-if="data.hour_meter">
              <span class="doc-info-label">{{ __('Hour Meter') }}</span>
              <span class="doc-info-value">{{ data.hour_meter }}</span>
            </div>
          </div>

          <!-- Equipment -->
          <template v-if="data.equipment_rows?.length">
            <hr class="doc-rule-light" />
            <div v-for="(eq, i) in data.equipment_rows" :key="i" class="doc-equipment-row">
              <span class="doc-eq-cell"><span class="doc-info-label">{{ __('Make') }}</span> {{ eq.make }}</span>
              <span class="doc-eq-cell"><span class="doc-info-label">{{ __('Model') }}</span> {{ eq.model }}</span>
              <span class="doc-eq-cell"><span class="doc-info-label">{{ __('Serial') }}</span> {{ eq.serial_no }}</span>
              <span class="doc-eq-cell"><span class="doc-info-label">{{ __('Unit') }}</span> {{ eq.unit }}</span>
            </div>
          </template>

          <!-- Documentation -->
          <template v-if="data.problem_with_lift || data.repair_description">
            <hr class="doc-rule-light" />
            <div class="doc-two-col">
              <div v-if="data.problem_with_lift" class="doc-doc-block">
                <p class="doc-section-label">{{ __('Problem Reported') }}</p>
                <p class="doc-doc-text">{{ data.problem_with_lift }}</p>
              </div>
              <div v-if="data.repair_description" class="doc-doc-block">
                <p class="doc-section-label">{{ __('Work Performed') }}</p>
                <p class="doc-doc-text">{{ data.repair_description }}</p>
              </div>
            </div>
          </template>

          <!-- Parts table -->
          <template v-if="data.service_items?.length">
            <hr class="doc-rule-light" />
            <p class="doc-section-label">{{ __('Parts') }}</p>
            <table class="doc-table">
              <thead>
                <tr>
                  <th class="doc-th-desc">{{ __('Description') }}</th>
                  <th class="doc-th-qty">{{ __('Qty') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in data.service_items" :key="i">
                  <td>{{ item.description || item.label }}</td>
                  <td class="doc-td-qty">{{ item.qty }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Signature section -->
          <hr class="doc-rule-light" />
          <p class="doc-section-label">{{ __('Customer Signature') }}</p>
          <p class="doc-sig-instruction">
            {{ __('By signing below, the customer acknowledges that the work described above has been completed to their satisfaction.') }}
          </p>

          <div class="doc-canvas-wrapper">
            <canvas
              ref="canvasRef"
              class="doc-canvas"
              @pointerdown.prevent="beginStroke"
              @pointermove.prevent="continueStroke"
              @pointerup="endStroke"
              @pointerleave="endStroke"
            />
            <span class="doc-canvas-label">{{ __('Sign here') }}</span>
          </div>

          <div class="doc-sig-actions">
            <button class="doc-btn-clear" @click="clearCanvas">{{ __('Clear') }}</button>
          </div>

          <p v-if="submitError" class="doc-error">{{ submitError }}</p>

          <button class="doc-btn-submit" :disabled="submitting" @click="onSubmit">
            <span v-if="submitting">{{ __('Submitting...') }}</span>
            <span v-else>{{ __('Submit Signature') }}</span>
          </button>

          <hr class="doc-rule-light" />
          <p class="doc-footer">{{ data.company_name }} · {{ data.company_phone }} · {{ data.company_email }}</p>

        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, inject } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonContent } from '@ionic/vue'
import { FeatherIcon, LoadingIndicator } from 'frappe-ui'
import { getSignaturePageData, getGuestCsrfToken, submitSignature, type SignaturePageData } from '@/services/api'
import { formatDate } from '@/utils/date'

type PageState = 'loading' | 'expired' | 'signed' | 'ready' | 'done'

const route = useRoute()
const __ = inject<(t: string) => string>('$translate', (t) => t)
const token       = (route.query.token as string) ?? ''
const state       = ref<PageState>('loading')
const data        = ref<SignaturePageData | null>(null)
const submitError = ref('')
const submitting  = ref(false)
let   csrfToken   = ''

// ── Canvas ────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
let   ctx: CanvasRenderingContext2D | null = null
let   isDrawing = false

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr  = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width  = rect.width  * dpr
  canvas.height = rect.height * dpr
  ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.strokeStyle = '#111'
  ctx.lineWidth   = 2
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
}

function getPos(e: PointerEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function beginStroke(e: PointerEvent) {
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  isDrawing = true
  const { x, y } = getPos(e)
  ctx!.beginPath()
  ctx!.moveTo(x, y)
}

function continueStroke(e: PointerEvent) {
  if (!isDrawing || !ctx) return
  const { x, y } = getPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function endStroke() { isDrawing = false }

function clearCanvas() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
}

function isCanvasBlank(): boolean {
  if (!ctx || !canvasRef.value) return true
  const { data: pixels } = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  return !new Uint32Array(pixels.buffer).some((px) => px !== 0)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!token) { state.value = 'expired'; return }
  try {
    const [pageData, csrf] = await Promise.all([getSignaturePageData(token), getGuestCsrfToken()])
    csrfToken = csrf
    if (pageData.expired)        { state.value = 'expired'; return }
    if (pageData.already_signed) { state.value = 'signed';  return }
    data.value  = pageData
    state.value = 'ready'
    await nextTick()
    initCanvas()
  } catch {
    state.value = 'expired'
  }
})

// ── Submit ────────────────────────────────────────────────────────────────
async function onSubmit() {
  submitError.value = ''
  if (isCanvasBlank()) { submitError.value = __('Please sign before submitting.'); return }
  submitting.value = true
  try {
    await submitSignature(token, canvasRef.value!.toDataURL('image/png'), csrfToken)
    state.value = 'done'
  } catch (err: unknown) {
    const e = err as { _error_message?: string; message?: string }
    submitError.value = e?._error_message ?? e?.message ?? __('Failed to submit. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.sig-content { --background: #e8e8e8; }

.doc-wrapper { display: flex; justify-content: center; padding: 24px 12px 48px; }

.doc-paper {
  background: #fff;
  width: 100%;
  max-width: 680px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  padding: 28px 28px 32px;
  font-family: 'Georgia', serif;
  font-size: 13px;
  color: #111;
}

.doc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.doc-logo { height: 52px; width: auto; object-fit: contain; filter: grayscale(100%); }
.doc-header-center { text-align: center; flex: 1; }
.doc-contact { margin: 2px 0; font-size: 11px; color: #555; }
.doc-company-name { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.doc-header-right { text-align: right; }

.doc-rule       { border: none; border-top: 2px solid #111; margin: 10px 0; }
.doc-rule-light { border: none; border-top: 1px solid #ccc; margin: 14px 0; }

.doc-title-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.06em; }
.doc-wo-number { font-size: 13px; color: #444; font-style: italic; }

.doc-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
.doc-info-cell { display: flex; flex-direction: column; gap: 1px; }
.doc-info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; font-family: sans-serif; }
.doc-info-value { font-size: 13px; font-weight: 600; }

.doc-equipment-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 6px 0; }
.doc-eq-cell { display: flex; gap: 4px; align-items: baseline; font-size: 12px; }

.doc-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.doc-section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; font-family: sans-serif; margin: 0 0 6px; font-weight: 700; }
.doc-doc-text { font-size: 12px; margin: 0; line-height: 1.5; color: #222; white-space: pre-wrap; }

.doc-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
.doc-table thead tr { border-bottom: 1px solid #111; }
.doc-table th { text-align: left; font-family: sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 6px 4px 0; color: #555; }
.doc-table td { padding: 5px 6px 5px 0; border-bottom: 1px solid #eee; vertical-align: top; }
.doc-table tbody tr:last-child td { border-bottom: none; }
.doc-th-qty, .doc-td-qty { text-align: right; width: 48px; }

.doc-sig-instruction { font-size: 11px; color: #555; margin: 0 0 10px; line-height: 1.4; }
.doc-canvas-wrapper { position: relative; border: 1px solid #bbb; border-radius: 4px; background: #fafafa; overflow: hidden; touch-action: none; }
.doc-canvas { display: block; width: 100%; height: 160px; cursor: crosshair; touch-action: none; }
.doc-canvas-label { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #bbb; font-style: italic; pointer-events: none; user-select: none; }

.doc-sig-actions { display: flex; justify-content: flex-end; margin-top: 6px; }
.doc-btn-clear { background: none; border: 1px solid #bbb; border-radius: 4px; padding: 4px 12px; font-size: 11px; color: #666; cursor: pointer; font-family: sans-serif; }
.doc-btn-clear:hover { border-color: #888; color: #333; }

.doc-error { color: #c0392b; font-size: 11px; margin: 8px 0 0; font-family: sans-serif; }

.doc-btn-submit { display: block; width: 100%; margin-top: 16px; padding: 12px; background: #111; color: #fff; border: none; border-radius: 4px; font-size: 14px; font-family: sans-serif; font-weight: 600; letter-spacing: 0.04em; cursor: pointer; text-transform: uppercase; }
.doc-btn-submit:disabled { background: #888; cursor: not-allowed; }
.doc-btn-submit:not(:disabled):hover { background: #333; }

.doc-footer { font-size: 10px; color: #999; text-align: center; margin: 0; font-family: sans-serif; }

@media (max-width: 480px) {
  .doc-wrapper { padding: 12px 0 40px; }
  .doc-paper { padding: 20px 16px 24px; box-shadow: none; }
  .doc-two-col { grid-template-columns: 1fr; }
  .doc-info-grid { grid-template-columns: 1fr; }
}
</style>
