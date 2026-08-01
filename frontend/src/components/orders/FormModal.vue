<template>
    <!-- Full-screen modal — no card rounding, covers entire viewport -->
    <ion-modal :is-open="isOpen" :can-dismiss="canDismissHandler" @did-dismiss="onDismissed"
        style="--width: 100%; --height: 100%; --max-width: 100%; --max-height: 100%; --border-radius: 0;">
        <!-- ── Header ────────────────────────────────────────────────────────── -->
        <ion-header class="ion-no-border">
            <ion-toolbar style="--background: #172554; --color: #fff; --min-height: 56px;">
                <ion-title style="font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em;">
                    {{ modalTitle }}
                </ion-title>
                <ion-buttons slot="end">
                    <ion-button @click="attemptClose" style="--color: rgba(255,255,255,0.55);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>

            <!-- Status sub-bar (edit mode only) -->
            <div v-if="isEditMode && swo"
                class="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white">
                <span class="text-xs text-slate-500 truncate mr-2">{{ swo.customer }}</span>
                <span class="flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    :class="statusClass(swo.status)">
                    {{ __(swo.status) }}
                </span>
            </div>
        </ion-header>

        <!-- ── Content ───────────────────────────────────────────────────────── -->
        <ion-content style="--background: #f8fafc;">

            <!-- Loading overlay -->
            <div v-if="loading" class="flex min-h-[50vh] items-center justify-center">
                <ion-spinner name="crescent" />
            </div>

            <div v-else class="px-4 py-5 pb-10 space-y-5 max-w-lg mx-auto">

                <!-- ────────────────────────────────────────────────────────────────
             CREATE MODE
             ──────────────────────────────────────────────────────────────── -->
                <template v-if="!isEditMode">

                    <!-- Customer -->
                    <ion-item>
                        <ion-select :label="__('Customer') + ' *'" label-placement="stacked"
                            v-model="createForm.customer" @ionChange="onCustomerChange"
                            :placeholder="__('Select customer')" interface="action-sheet">
                            <ion-select-option v-for="c in customers" :key="c.name" :value="c.name">
                                {{ c.customer_name }}
                            </ion-select-option>
                        </ion-select>
                    </ion-item>

                    <!-- Scheduled Date -->
                    <ion-item class="custom-ion-item">
                        <ion-input type="date" :label="__('Scheduled Date') + ' *'" label-placement="stacked"
                            v-model="createForm.scheduled_date" @ionChange="onDateChange" />
                    </ion-item>

                    <!-- Service Type -->
                    <ion-item class="custom-ion-item">
                        <ion-select :label="__('Service Type') + ' *'" label-placement="stacked"
                            v-model="createForm.service_type" @ionChange="onServiceTypeChange"
                            :placeholder="__('Select type')" interface="action-sheet">
                            <ion-select-option v-for="t in serviceTypeOptions" :key="t.value" :value="t.value">
                                {{ t.label }}
                            </ion-select-option>
                        </ion-select>
                    </ion-item>

                    <!-- Equipment -->
                    <div>
                        <label class="block mb-1.5 text-sm text-slate-600">
                            {{ __('Equipment') }} <span class="text-red-500">*</span>
                        </label>

                        <!-- Multi-select sheet (enabled per settings) -->
                        <template v-if="allowsMultiEquip">
                            <div v-if="loadingEquipment" class="flex items-center gap-2 text-sm text-slate-400 py-2">
                                <ion-spinner name="crescent" class="spinner-small" />
                                {{ __('Loading...') }}
                            </div>
                            <p v-else-if="!createForm.customer || !createForm.service_type"
                                class="text-sm text-slate-400">
                                {{ !createForm.service_type ? __('Select a service type first') :
                                    __('Select a customer first') }}
                            </p>
                            <p v-else-if="equipment.length === 0" class="text-sm text-amber-600">
                                {{ __('No active equipment found for this customer on the selected date') }}
                            </p>
                            <div v-else>
                                <!-- Selected equipment tags (vertical scroll) -->
                                <div class="flex flex-col gap-1.5 overflow-y-auto mb-2"
                                    style="max-height: 160px;">
                                    <span v-if="createForm.equipment_selection.length === 0"
                                        class="text-sm text-slate-400 py-1">
                                        {{ __('No equipment selected') }}
                                    </span>
                                    <ion-chip v-for="name in createForm.equipment_selection" :key="name"
                                        style="--background:#eff6ff; color:#1e3a8a; border:1px solid #bfdbfe; margin:0; width:100%;">
                                        {{ equipmentLabel(name) }}
                                    </ion-chip>
                                </div>
                                <!-- Manage button -->
                                <button @click="openEquipmentSheet"
                                    class="w-full text-sm font-semibold text-blue-950 border border-blue-950 rounded-lg py-2.5 bg-white shadow-sm active:opacity-70 transition-opacity">
                                    {{ __('Manage Equipment') }}
                                </button>
                            </div>
                        </template>

                        <!-- Single select (PM / Labor Rate) — bottom sheet with search -->
                        <template v-else>
                            <div v-if="loadingEquipment" class="flex items-center gap-2 text-sm text-slate-400 py-2">
                                <ion-spinner name="crescent" class="spinner-small" />
                                {{ __('Loading...') }}
                            </div>
                            <p v-else-if="equipmentError" class="text-xs text-red-500">
                                {{ __('Could not load equipment') }}
                            </p>
                            <p v-else-if="!createForm.customer || !createForm.service_type"
                                class="text-sm text-slate-400">
                                {{ !createForm.service_type ? __('Select a service type first') :
                                    __('Select a customer first') }}
                            </p>
                            <p v-else-if="equipment.length === 0" class="text-sm text-amber-600">
                                {{ __('No active equipment found for this customer on the selected date') }}
                            </p>
                            <div v-else>
                                <div v-if="singleEquipment" class="mb-2">
                                    <ion-chip
                                        style="--background:#eff6ff; color:#1e3a8a; border:1px solid #bfdbfe; margin:0; width:100%;">
                                        {{ equipmentLabel(singleEquipment) }}
                                    </ion-chip>
                                </div>
                                <button @click="openSingleEquipSheet"
                                    class="w-full text-sm font-semibold text-blue-950 border border-blue-950 rounded-lg py-2.5 bg-white shadow-sm active:opacity-70 transition-opacity">
                                    {{ singleEquipment ? __('Change Equipment') : __('Select Equipment') }}
                                </button>
                            </div>
                        </template>
                    </div>

                    <ion-input :label="__('Hour Meter')" label-placement="stacked" v-model="createForm.hour_meter"
                        type="text" inputmode="numeric" :placeholder="__('e.g. 1234')" />

                    <!-- PO Number -->
                    <ion-input :label="__('PO Number')" label-placement="stacked" v-model="createForm.po_number"
                        type="text" :placeholder="__('Customer purchase order')" />


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
                        <div v-if="previousWONumber" class="col-span-2">
                            <p class="text-xs text-slate-400 mb-0.5">{{ __('Previous Work Order') }}</p>
                            <p class="text-sm font-semibold text-slate-800">{{ previousWONumber }}</p>
                        </div>
                    </div>

                    <!-- Equipment (read-only) -->
                    <div v-if="swo.equipment_selection?.length" class="bg-white rounded-xl p-4 shadow-sm">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{{ __('Equipment')
                        }}</p>
                        <div v-for="row in swo.equipment_selection" :key="row.name"
                            class="flex items-center gap-2 py-1 text-sm text-slate-700">
                            <svg class="flex-shrink-0 text-slate-400" width="13" height="13" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path
                                    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span>{{ row.equipment }}</span>
                        </div>
                    </div>

                    <!-- Hour Meter (editable) -->
                    <ion-item class="custom-ion-item">
                        <ion-input :label="__('Hour Meter')" label-placement="stacked" v-model="editForm.hour_meter"
                            type="text" inputmode="numeric" :placeholder="__('e.g. 1234')" :readonly="isLocked" />
                    </ion-item>

                    <!-- PO Number (editable) -->
                    <ion-item class="custom-ion-item">
                        <ion-input :label="__('PO Number')" label-placement="stacked" v-model="editForm.po_number"
                            type="text" :placeholder="__('Customer purchase order')" :readonly="isLocked" />
                    </ion-item>

                    <!-- Documentation -->
                    <template v-if="showDocumentation">
                        <ion-item class="custom-ion-item">
                            <ion-textarea :label="__('Problem With Equipment')" label-placement="stacked"
                                v-model="editForm.problem_with_lift" :rows="3"
                                :placeholder="isEditable ? __('Describe the reported problem...') : ''"
                                :readonly="isLocked" auto-grow />
                        </ion-item>
                        <ion-item class="custom-ion-item">
                            <ion-textarea :label="__('Repair Description')" label-placement="stacked"
                                v-model="editForm.repair_description" :rows="4"
                                :placeholder="isEditable ? __('Describe the work performed...') : ''"
                                :readonly="isLocked" auto-grow />
                        </ion-item>
                    </template>

                    <!-- Parts / Items (Repairing, Partial Repair, and read-only for locked) -->
                    <div v-if="showDocumentation" class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-semibold text-slate-700">{{ __('Parts / Items') }}</span>
                            <ion-button v-if="isEditable" fill="clear" size="small"
                                style="--color: #172554; margin: 0; font-weight: 600;" @click="openPartSheet">
                                <div class="flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    {{ __('Add') }}
                                </div>
                            </ion-button>
                        </div>

                        <!-- Item list -->
                        <div v-if="localItems.length" class="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div v-for="(item, idx) in localItems" :key="idx"
                                class="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold text-slate-800 truncate">
                                        {{ item.item_code || item.part_number || '—' }}
                                    </p>
                                    <p class="text-xs text-slate-500">{{ item.description }}</p>
                                    <p class="text-xs text-slate-400">
                                        {{ __('Qty') }}: {{ item.qty }}
                                        <span v-if="item.vendor"> · {{ item.vendor }}</span>
                                    </p>

                                    <!-- Attachment -->
                                    <div v-if="item.attachment" class="mt-2 flex items-center gap-2">
                                        <a :href="item.attachment" target="_blank" rel="noopener"
                                            class="flex items-center gap-2 min-w-0">
                                            <img v-if="isImageAttachment(item.attachment)" :src="item.attachment"
                                                class="w-10 h-10 rounded-md object-cover border border-slate-200" />
                                            <span v-else
                                                class="flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 bg-slate-50">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                    stroke="#475569" stroke-width="2" stroke-linecap="round"
                                                    stroke-linejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                            </span>
                                            <span class="text-xs text-blue-900 underline truncate">
                                                {{ attachmentName(item.attachment) }}
                                            </span>
                                        </a>
                                        <button v-if="isEditable" type="button"
                                            class="text-xs text-red-500 font-semibold underline flex-shrink-0"
                                            @click="removeAttachment(idx)">
                                            {{ __('Remove') }}
                                        </button>
                                    </div>
                                    <button v-else-if="isEditable" type="button"
                                        :disabled="uploadingAttachment"
                                        class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-950 underline disabled:opacity-50"
                                        @click="pickAttachment(idx)">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                            stroke-linejoin="round">
                                            <path
                                                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                        </svg>
                                        {{ uploadingAttachment && attachTargetIdx === idx
                                            ? __('Uploading...')
                                            : __('Attach file') }}
                                    </button>
                                </div>
                                <ion-button v-if="isEditable" fill="clear" color="danger" size="small"
                                    class="remove-btn" @click="removeItem(idx)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6" />
                                        <path d="M14 11v6" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                </ion-button>
                            </div>
                        </div>
                        <p v-else-if="isEditable" class="text-sm text-slate-400 text-center py-1">
                            {{ __('No items added yet.') }}
                        </p>

                        <!-- Hidden picker used by the per-row "Attach file" buttons -->
                        <input ref="rowFileInput" type="file" class="hidden"
                            accept="image/*,application/pdf"
                            @change="onAttachmentSelected" />

                    </div>

                    <div v-if="showHoursInput"
                        class="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4 shadow-sm">
                        <p class="text-sm font-semibold text-amber-800">
                            {{ swo?.service_type === 'PM Frequency'
                                ? __('Schedule the next service')
                                : swo?.service_type === 'Misc'
                                    ? __('Enter hours worked and schedule the next service')
                                    : __('Enter hours worked to finish the repair') }}
                        </p>

                        <!-- Hours input — Labor Rate and Misc only -->
                        <template v-if="['Labor Rate', 'Misc'].includes(swo?.service_type ?? '')">
                            <ion-item class="custom-ion-item" style="--background: transparent; --border-color: #fde68a;">
                                <ion-input :label="__('Hours Worked') + ' *'" label-placement="stacked"
                                    v-model="hoursInput" type="number" step="0.1" placeholder="e.g. 2.5"
                                    class="hour-input" />
                            </ion-item>
                            <p v-if="hoursError" class="mt-1 text-xs text-red-500 font-medium px-2">{{ hoursError }}</p>
                        </template>

                        <!-- Skip scheduling toggle — PM Frequency and Misc -->
                        <template v-if="['PM Frequency', 'Misc'].includes(swo?.service_type ?? '')">
                            <div class="flex items-center gap-3 py-1">
                                <ion-checkbox
                                    v-model="skipScheduling"
                                    class="flex-shrink-0"
                                />
                                <span class="text-sm text-amber-900">{{ __('Finish without scheduling next service') }}</span>
                            </div>
                        </template>

                        <!-- Next Scheduled Date — PM Frequency and Misc, hidden when skipping -->
                        <template v-if="['PM Frequency', 'Misc'].includes(swo?.service_type ?? '') && !skipScheduling">
                            <ion-item class="custom-ion-item"
                                style="--background: transparent; --border-color: #fde68a;">
                                <ion-input :label="__('Next Scheduled Date') + ' *'" label-placement="stacked"
                                    v-model="nextScheduledDate" type="date" class="hour-input" />
                            </ion-item>
                            <p v-if="nextDateError" class="mt-1 text-xs text-red-500 font-medium px-2">{{ nextDateError }}</p>
                        </template>

                        <div class="flex gap-2">
                            <ion-button fill="outline" color="medium" class="flex-1"
                                @click="showHoursInput = false; hoursInput = ''; hoursError = ''; nextScheduledDate = ''; nextDateError = ''; skipScheduling = false">
                                {{ __('Cancel') }}
                            </ion-button>
                            <ion-button color="success" class="flex-1" :disabled="acting" @click="confirmFinishRepair">
                                <ion-spinner v-if="acting" name="crescent" />
                                <span v-else>{{ __('Confirm') }}</span>
                            </ion-button>
                        </div>
                    </div>

                    <!-- Signature section (Staged) -->
                    <div v-if="swo.status === 'Staged'" class="bg-white rounded-xl shadow-sm p-4 space-y-4">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {{ __('Customer Signature') }}</p>

                        <template v-if="!swo.signature_link">
                            <div class="space-y-2">
                                <ion-button expand="block" class="action-btn"
                                    style="--background: #172554; --color: #fff; margin: 0; font-weight: 700;"
                                    :disabled="acting" @click="onGenerateLink">
                                    <ion-spinner v-if="acting && lastAction === 'generate'" name="crescent" />
                                    <template v-else>
                                        <div class="flex items-center gap-2">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                stroke-linejoin="round">
                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                <path
                                                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                            </svg>
                                            <span>{{ __('Generate Signature Link') }}</span>
                                        </div>
                                    </template>
                                </ion-button>

                                <!-- Conditional Skip Signature (direct action) -->
                                <button v-if="allowSkipSignature" type="button" @click="onSkipSignature"
                                    :disabled="acting"
                                    class="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors border-2 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                    {{ __('Skip Signature') }}
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            <button type="button" @click="openSignatureLink"
                                class="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors shadow-md"
                                style="background: #172554; color: #ffffff;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                {{ __('Open Signature Link') }}
                            </button>
                            <div class="grid grid-cols-2 gap-2">
                                <button type="button" @click="copySignatureLink"
                                    class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    {{ __('Copy Link') }}
                                </button>
                                <button type="button" @click="onGenerateLink" :disabled="acting"
                                    class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    {{ __('Regenerate') }}
                                </button>
                            </div>

                            <!-- Conditional Skip Signature (visible even if link exists) -->
                            <button v-if="allowSkipSignature" type="button" @click="onSkipSignature" :disabled="acting"
                                class="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors border-2 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 mt-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                                {{ __('Skip Signature') }}
                            </button>
                        </template>
                    </div>

                    <!-- Locked notice (Completed / Invoiced / Cancelled) -->
                    <div v-if="isLocked && swo.status !== 'Staged'"
                        class="flex items-center gap-2 text-sm text-slate-400 justify-center py-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
                        :style="submitting ? 'opacity:.5;cursor:not-allowed;' : ''" :disabled="submitting"
                        @click="handleCreate">
                        <span v-if="submitting"
                            class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span v-else>{{ __('Create Work Order') }}</span>
                    </button>
                </template>

                <!-- EDIT MODE -->
                <template v-else-if="swo && !showHoursInput">

                    <!-- New / Programmed → Start Repair (Amber) -->
                    <button v-if="['New', 'Programmed'].includes(swo.status)"
                        style="width:100%; background:#f59e0b; color:#fff; border-radius:8px; padding:14px; font-size:14px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:opacity .15s;"
                        :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''" :disabled="acting"
                        @click="act('Repairing')">
                        <span v-if="acting"
                            class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span v-else>{{ __('Start Repair') }}</span>
                    </button>

                    <!-- Repairing / Partial Repair: icon-only 3-button bar -->
                    <template v-else-if="isEditable">
                        <div class="flex items-stretch gap-2">

                            <!-- Save & Close (Navy Blue) -->
                            <button :title="__('Save & Close')" :disabled="saving" @click="handleSaveAndClose"
                                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; background:#172554; color:#fff; transition:opacity .15s;"
                                :style="saving ? 'opacity:.5;cursor:not-allowed;' : ''">
                                <span v-if="saving"
                                    class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                                <template v-else>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    <span
                                        style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{
                                            __('Save') }}</span>
                                </template>
                            </button>

                            <!-- Pause Repair (Amber) / Resume (Slate outline) -->
                            <button v-if="swo.status === 'Repairing'" :title="__('Pause Repair')" :disabled="acting"
                                @click="openPauseSheet()"
                                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; background:#f59e0b; color:#fff; transition:opacity .15s;"
                                :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''">
                                <span v-if="acting && lastAction === 'Partial Repair'"
                                    class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                                <template v-else>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="6" y="4" width="4" height="16" />
                                        <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                    <span
                                        style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{
                                            __('Pause') }}</span>
                                </template>
                            </button>
                            <button v-else-if="swo.status === 'Partial Repair'" :title="__('Resume')" :disabled="acting"
                                @click="act('Repairing')"
                                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; border:1.5px solid #e2e8f0; color:#475569; transition:opacity .15s;"
                                :style="acting ? 'opacity:.5;cursor:not-allowed;' : ''">
                                <span v-if="acting && lastAction === 'Repairing'"
                                    class="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin block" />
                                <template v-else>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    <span
                                        style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{
                                            __('Resume') }}</span>
                                </template>
                            </button>

                            <!-- Finish Repair (Emerald) -->
                            <button :title="__('Finish Repair')" :disabled="acting || saving" @click="onFinishRepair"
                                style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; padding:12px 0; background:#059669; color:#fff; transition:opacity .15s;"
                                :style="(acting || saving) ? 'opacity:.5;cursor:not-allowed;' : ''">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                                <span
                                    style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; line-height:1;">{{
                                        __('Finish') }}</span>
                            </button>

                        </div>
                    </template>

                    <!-- PDF download (Staged / Completed) -->
                    <SwoPdfButton :status="swo.status" :name="swo.name" :work-order-number="swo.work_order_number" />

                </template>

            </div>
        </ion-footer>

        <!-- ── Add Part bottom sheet ─────────────────────────────────────────── -->
        <ion-modal :is-open="showPartSheet" :initial-breakpoint="0.85" :breakpoints="[0, 0.85, 1]"
            style="--border-radius: 16px;" @did-dismiss="closePartSheet">
            <!-- Fixed header: Add (left) | Title (center) | Close X (right) -->
            <ion-header class="ion-no-border">
                <ion-toolbar style="--background: #fff; --min-height: 56px;">
                    <!-- Left: primary action — native pill button to bypass Ionic clear-fill default -->
                    <ion-buttons slot="start" style="padding-left: 8px;">
                        <button @click="confirmAddPart"
                            style="background:#172554; color:#fff; border-radius:9999px; padding:6px 16px; font-size:14px; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:opacity .15s; white-space:nowrap; cursor:pointer;">
                            {{ __('Add') }}
                        </button>
                    </ion-buttons>

                    <ion-title style="font-size: 15px; font-weight: 700; color: #0f172a; text-align: center;">
                        {{ __('Add Part') }}
                    </ion-title>

                    <!-- Right: dismiss -->
                    <ion-buttons slot="end">
                        <ion-button @click="closePartSheet" style="--color: #ef4444;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </ion-button>
                    </ion-buttons>
                </ion-toolbar>
                <div style="height:1px; background:#f1f5f9;" />
            </ion-header>

            <ion-content style="--background: #f8fafc;">
                <div class="px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto" style="color:#0f172a;">

                    <!-- Non-inventory checkbox (explicit styled — bypasses Material Tailwind reset) -->
                    <label
                        class="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm cursor-pointer select-none"
                        @click.prevent="partForm.is_non_inventory = !partForm.is_non_inventory; partForm.item_code = ''; partForm.part_number = ''; partForm.description = ''; sheetItemSearchResults = []">
                        <span
                            class="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors duration-150"
                            :style="partForm.is_non_inventory
                                ? 'background:#172554; border-color:#172554;'
                                : 'background:#fff; border-color:#94a3b8;'">
                            <svg v-if="partForm.is_non_inventory" width="11" height="11" viewBox="0 0 12 12" fill="none"
                                stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="1.5 6 4.5 9 10.5 3" />
                            </svg>
                        </span>
                        <span class="text-sm font-medium text-slate-800">{{ __('Non-inventory part') }}</span>
                    </label>

                    <!-- INVENTORY PART -->
                    <template v-if="!partForm.is_non_inventory">
                        <!-- Item Code search -->
                        <div class="relative">
                            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Item Code') }} <span
                                    class="text-red-500">*</span></label>
                            <input type="text" v-model="partForm.item_code" :placeholder="__('Type to search...')"
                                @input="onSheetItemSearch"
                                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
                            <div v-if="sheetItemSearchResults.length"
                                class="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                                <button v-for="r in sheetItemSearchResults" :key="r.name" type="button"
                                    class="flex w-full flex-col px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                    @click="selectSheetItemResult(r)">
                                    <span class="text-sm font-semibold text-slate-800">{{ r.name }}</span>
                                    <span class="text-xs text-slate-500">{{ r.item_name }}</span>
                                </button>
                            </div>
                        </div>
                        <!-- Part Number (auto-filled, read-only) -->
                        <div>
                            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Part Number') }}</label>
                            <input type="text" v-model="partForm.part_number" readonly
                                :placeholder="__('Auto-filled from item')"
                                class="w-full bg-slate-50 placeholder:text-slate-400 text-slate-600 text-sm border border-slate-200 rounded-md px-3 py-2 cursor-default" />
                        </div>
                        <!-- Description (auto-filled, editable) -->
                        <div>
                            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Description') }}</label>
                            <input type="text" v-model="partForm.description" :placeholder="__('Auto-filled from item')"
                                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
                        </div>
                    </template>

                    <!-- NON-INVENTORY PART -->
                    <template v-else>
                        <!-- Part Number -->
                        <div>
                            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Part Number') }}</label>
                            <input type="text" v-model="partForm.part_number" placeholder="e.g. ABC-001"
                                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
                        </div>
                        <!-- Vendor -->
                        <div>
                            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Vendor') }}</label>
                            <input type="text" v-model="partForm.vendor" :placeholder="__('Optional')"
                                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
                        </div>
                        <!-- Description -->
                        <div>
                            <label class="block mb-1.5 text-sm text-slate-600">{{ __('Description') }}</label>
                            <input type="text" v-model="partForm.description" :placeholder="__('Part description')"
                                class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
                        </div>
                    </template>

                    <!-- Qty (always shown) -->
                    <div>
                        <label class="block mb-1.5 text-sm text-slate-600">{{ __('Qty') }} <span
                                class="text-red-500">*</span></label>
                        <input type="number" v-model="partForm.qty" placeholder="1" step="0.01" min="0.01"
                            class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-950 hover:border-slate-300 shadow-sm transition duration-300" />
                    </div>

                    <!-- Attachment (optional) -->
                    <div>
                        <label class="block mb-1.5 text-sm text-slate-600">{{ __('Attachment') }}</label>
                        <div v-if="partForm.attachment"
                            class="flex items-center gap-3 bg-white rounded-md border border-slate-200 px-3 py-2 shadow-sm">
                            <img v-if="isImageAttachment(partForm.attachment)" :src="partForm.attachment"
                                class="w-10 h-10 rounded-md object-cover border border-slate-200" />
                            <span v-else
                                class="flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 bg-slate-50">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </span>
                            <span class="flex-1 min-w-0 text-xs text-slate-600 truncate">
                                {{ attachmentName(partForm.attachment) }}
                            </span>
                            <button type="button" class="text-xs text-red-500 font-semibold underline flex-shrink-0"
                                @click="removeAttachment(null)">
                                {{ __('Remove') }}
                            </button>
                        </div>
                        <button v-else type="button" :disabled="uploadingAttachment"
                            class="w-full flex items-center justify-center gap-2 bg-white text-sm font-medium text-blue-950 border border-dashed border-slate-300 rounded-md px-3 py-2.5 shadow-sm disabled:opacity-50"
                            @click="pickAttachment(null)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path
                                    d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            {{ uploadingAttachment ? __('Uploading...') : __('Take photo or attach file') }}
                        </button>
                        <input ref="sheetFileInput" type="file" class="hidden"
                            accept="image/*,application/pdf"
                            @change="onAttachmentSelected" />
                    </div>

                    <p v-if="partSheetError" class="text-sm text-red-500 text-center">{{ partSheetError }}</p>

                </div>
            </ion-content>

        </ion-modal>

        <!-- ── Manage Equipment bottom sheet ────────────────────────────────── -->
        <ion-modal :is-open="showEquipmentSheet" :initial-breakpoint="0.92" :breakpoints="[0, 0.92, 1]"
            style="--border-radius: 16px;" @did-dismiss="closeEquipmentSheet">
            <ion-header class="ion-no-border">
                <ion-toolbar style="--background: #fff; --min-height: 56px;">
                    <ion-buttons slot="start" style="padding-left: 8px;">
                        <button @click="saveEquipmentSelection" :disabled="false"
                            style="background:#172554; color:#fff; border-radius:9999px; padding:6px 16px; font-size:14px; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.25); cursor:pointer; white-space:nowrap;">
                            {{ __('Save') }}
                        </button>
                    </ion-buttons>
                    <ion-title style="font-size:15px; font-weight:700; color:#0f172a; text-align:center;">
                        {{ __('Manage Equipment') }}
                    </ion-title>
                    <ion-buttons slot="end">
                        <ion-button @click="closeEquipmentSheet" style="--color: #ef4444;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </ion-button>
                    </ion-buttons>
                </ion-toolbar>
                <!-- Equipment Type filter — only shown when there are types to filter by -->
                <div v-if="equipmentTypeOptions.length > 0"
                    style="padding: 4px 16px 8px; border-top: 1px solid #f1f5f9;">
                    <ion-item class="custom-ion-item" style="--min-height:44px;">
                        <ion-select :label="__('Filter by Type')" label-placement="stacked"
                            v-model="equipmentTypeFilter" interface="action-sheet">
                            <ion-select-option value="">{{ __('All Types') }}</ion-select-option>
                            <ion-select-option v-for="t in equipmentTypeOptions" :key="t" :value="t">
                                {{ t }}
                            </ion-select-option>
                        </ion-select>
                    </ion-item>
                </div>
            </ion-header>
            <ion-content style="--background: #f8fafc;">
                <div class="px-4 pt-4 pb-10 max-w-lg mx-auto space-y-5">

                    <!-- Available -->
                    <div>
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            {{ __('Available') }}
                        </p>
                        <!-- Search -->
                        <input v-model="equipmentSearch" type="text"
                            :placeholder="__('Search by name or unit ID...')"
                            class="w-full mb-2 bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-950 shadow-sm transition duration-300" />
                        <p v-if="availableEquipment.length === 0" class="text-sm text-slate-400 py-1">
                            {{ __('No equipment available') }}
                        </p>
                        <!-- Scrollable list capped at ~5 rows -->
                        <div v-else class="space-y-2 overflow-y-auto" style="max-height: 272px;">
                            <div v-for="e in availableEquipment" :key="e.name"
                                class="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                                <div>
                                    <p class="text-sm font-semibold text-slate-700">{{ e.name }}</p>
                                    <p class="text-xs text-slate-400">{{ e.customer_unit_id_number }}<span v-if="e.equipment_type"> · {{ e.equipment_type }}</span></p>
                                </div>
                                <button @click="draftAdd(e.name)"
                                    class="text-xs font-semibold text-blue-950 border border-blue-950 rounded-full px-3 py-1 active:opacity-60 transition-opacity flex-shrink-0">
                                    {{ __('Add') }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Selected -->
                    <div>
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            {{ __('Selected') }}
                        </p>
                        <p v-if="selectedEquipment.length === 0" class="text-sm text-slate-400 py-1">
                            {{ __('None selected') }}
                        </p>
                        <div v-else class="space-y-2">
                            <div v-for="e in selectedEquipment" :key="e.name"
                                class="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                                <div>
                                    <p class="text-sm font-semibold text-slate-700">{{ e.name }}</p>
                                    <p class="text-xs text-slate-400">{{ e.customer_unit_id_number }}<span v-if="e.equipment_type"> · {{ e.equipment_type }}</span></p>
                                </div>
                                <button @click="draftRemove(e.name)"
                                    class="text-xs font-semibold text-red-600 border border-red-300 rounded-full px-3 py-1 active:opacity-60 transition-opacity flex-shrink-0">
                                    {{ __('Remove') }}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </ion-content>
        </ion-modal>

        <!-- ── Single Equipment bottom sheet (PM / Labor Rate) ─────────────── -->
        <ion-modal :is-open="showSingleEquipSheet" :initial-breakpoint="0.85" :breakpoints="[0, 0.85, 1]"
            style="--border-radius: 16px;" @did-dismiss="closeSingleEquipSheet">
            <ion-header class="ion-no-border">
                <ion-toolbar style="--background: #fff; --min-height: 56px;">
                    <ion-title style="font-size:15px; font-weight:700; color:#0f172a; text-align:center;">
                        {{ __('Select Equipment') }}
                    </ion-title>
                    <ion-buttons slot="end">
                        <ion-button @click="closeSingleEquipSheet" style="--color: #ef4444;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </ion-button>
                    </ion-buttons>
                </ion-toolbar>
                <div style="padding: 4px 16px 12px; border-top: 1px solid #f1f5f9;">
                    <input v-model="singleEquipSearch" type="text"
                        :placeholder="__('Search by name or unit ID...')"
                        class="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-950 shadow-sm transition duration-300" />
                </div>
            </ion-header>
            <ion-content style="--background: #f8fafc;">
                <div class="px-4 pt-2 pb-10 max-w-lg mx-auto space-y-2">
                    <p v-if="filteredSingleEquip.length === 0" class="text-sm text-slate-400 py-2">
                        {{ __('No equipment available') }}
                    </p>
                    <button v-for="e in filteredSingleEquip" :key="e.name" type="button"
                        @click="selectSingleEquip(e.name)"
                        :class="['flex items-center justify-between w-full rounded-xl px-3 py-2.5 border shadow-sm text-left active:opacity-70 transition-opacity',
                            singleEquipment === e.name
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-slate-200']">
                        <div>
                            <p class="text-sm font-semibold text-slate-700">{{ e.name }}</p>
                            <p class="text-xs text-slate-400">{{ e.customer_unit_id_number }}<span
                                    v-if="e.equipment_type"> · {{ e.equipment_type }}</span></p>
                        </div>
                        <svg v-if="singleEquipment === e.name" width="18" height="18" viewBox="0 0 24 24"
                            fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round"
                            stroke-linejoin="round" class="flex-shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </button>
                </div>
            </ion-content>
        </ion-modal>

        <!-- ── Pause Repair bottom sheet ─────────────────────────────────────── -->
        <ion-modal :is-open="showPauseSheet" :initial-breakpoint="0.5" :breakpoints="[0, 0.5, 1]"
            style="--border-radius: 16px;" @did-dismiss="closePauseSheet">
            <ion-header class="ion-no-border">
                <ion-toolbar style="--background: #fff; --min-height: 56px;">
                    <ion-buttons slot="start" style="padding-left: 8px;">
                        <button @click="confirmPause" :disabled="acting"
                            style="background:#f59e0b; color:#fff; border-radius:9999px; padding:6px 16px; font-size:14px; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:opacity .15s; white-space:nowrap; cursor:pointer;">
                            <span v-if="acting" class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span v-else>{{ __('Confirm Pause') }}</span>
                        </button>
                    </ion-buttons>
                    <ion-title style="font-size: 15px; font-weight: 700; color: #0f172a; text-align: center;">
                        {{ __('Pause Repair') }}
                    </ion-title>
                    <ion-buttons slot="end">
                        <ion-button @click="closePauseSheet" style="--color: #ef4444;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </ion-button>
                    </ion-buttons>
                </ion-toolbar>
                <div style="height:1px; background:#f1f5f9;" />
            </ion-header>
            <ion-content style="--background: #f8fafc;">
                <div class="px-4 pt-4 pb-8 max-w-lg mx-auto">
                    <ion-item class="custom-ion-item" style="margin-top: 8px;">
                        <ion-textarea
                            :label="pauseReasonMandatory ? __('Reason') + ' *' : __('Reason (optional)')"
                            label-placement="stacked"
                            v-model="pauseReasonInput"
                            :rows="3"
                            :placeholder="__('Describe why you are pausing...')"
                            auto-grow />
                    </ion-item>
                    <p v-if="pauseReasonError" class="mt-2 text-sm text-red-500 text-center">{{ pauseReasonError }}</p>
                </div>
            </ion-content>
        </ion-modal>

    </ion-modal>
</template>

<script lang="ts">
export { open } from '@/composables/useFormModal'
</script>

<script setup lang="ts">
import { ref, computed, watch, inject, nextTick } from 'vue'
import { createResource } from 'frappe-ui'
import {
    IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonFooter, IonItem, IonLabel,
    IonSelect, IonSelectOption, IonInput, IonTextarea, IonSpinner, IonChip,
    IonCheckbox,
    alertController,
} from '@ionic/vue'
import {
    getCustomers, getCompanies, getCustomerEquipment, createSWO, getSWO,
    updateSWO, updateSWOStatus, searchItems, generateSignatureLink,
    getMiscDefaultDays, getSuggestedPMDate, getMultiEquipSettings, pauseRepair,
    checkResponsibleUser, getActiveCustomerPO, getSWOWorkOrderNumber, uploadFile,
    type Customer, type Equipment, type Company,
    type ServiceWorkOrderDetail, type SWOItem, type ItemResult,
} from '@/services/api'
import { session } from '@/data/session'
import { formatDate } from '@/utils/date'
import { useFormModal } from '@/composables/useFormModal'
import SwoPdfButton from '@/components/orders/SwoPdfButton.vue'

const { isOpen, swoName, close, notifySaved, notifyStatusUpdated } = useFormModal()

const __ = inject<(t: string) => string>('$translate', (t) => t)

// ── Mode ───────────────────────────────────────────────────────────────────────
const isEditMode = computed(() => swoName.value !== null)

const modalTitle = computed(() => {
    if (!isEditMode.value) return __('New Work Order')
    if (!swo.value) return swoName.value || '...'
    return `${__('Edit')} ${swo.value.work_order_number || swoName.value}`
})

// ── Shared state ───────────────────────────────────────────────────────────────
const isDirty = ref(false)
const loading = ref(false)
const submitting = ref(false)
const saving = ref(false)
const acting = ref(false)
const lastAction = ref('')
const actionError = ref('')

// ── App Settings ──────────────────────────────────────────────────────────────
const serviceManagerSettings = createResource({
    url: 'frappe.client.get_value',
    params: {
        doctype: 'Service Manager Settings',
        fieldname: ['allow_skip_signature', 'pause_reason_mandatory'],
    },
    auto: true,
})

const allowSkipSignature = computed(() => serviceManagerSettings.data?.allow_skip_signature === 1)
const pauseReasonMandatory = computed(() => serviceManagerSettings.data?.pause_reason_mandatory === 1)

// ──────────────────────────────────────────────────────────────────────────────
// CREATE MODE STATE
// ──────────────────────────────────────────────────────────────────────────────
const customers = ref<Customer[]>([])
const equipment = ref<Equipment[]>([])
const companies = ref<Company[]>([])
const loadingEquipment = ref(false)
const equipmentError = ref(false)
const singleEquipment = ref('')

const createForm = ref({
    customer: '',
    scheduled_date: todayISO(),
    service_type: '',
    equipment_selection: [] as string[],
    hour_meter: '',
    po_number: '',
})

const multiEquipAllowed = ref<string[]>([])
const allowsMultiEquip = computed(() => multiEquipAllowed.value.includes(createForm.value.service_type))

const serviceTypeOptions = [
    { label: 'PM Frequency', value: 'PM Frequency' },
    { label: 'Misc', value: 'Misc' },
    { label: 'Labor Rate', value: 'Labor Rate' },
]

const equipmentPlaceholder = computed(() =>
    equipmentDisabled.value ? __('Select customer & type first') : __('Select equipment')
)

const equipmentDisabled = computed(() =>
    !createForm.value.service_type ||
    !createForm.value.customer ||
    loadingEquipment.value ||
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
    hour_meter: '',
    po_number: '',
    problem_with_lift: '',
    repair_description: '',
})
const _originalEditForm = ref({ ...editForm.value })

// Items
const localItems = ref<SWOItem[]>([])
let _originalItemsJSON = '[]'

// Add Part sheet
const showPartSheet = ref(false)
const sheetItemSearchResults = ref<ItemResult[]>([])
const partSheetError = ref('')
const partForm = ref(blankPartForm())
let _sheetSearchTimer: ReturnType<typeof setTimeout> | null = null

// Part attachments
const sheetFileInput = ref<HTMLInputElement | null>(null)
const rowFileInput = ref<HTMLInputElement | null>(null)
/** Index of the item row whose attachment is being replaced, or null for the sheet. */
const attachTargetIdx = ref<number | null>(null)
const uploadingAttachment = ref(false)

// Hours / finish panel
const showHoursInput = ref(false)
const hoursInput = ref('')
const hoursError = ref('')
const nextScheduledDate = ref('')
const nextDateError = ref('')
const skipScheduling = ref(false)
let _finishPayload: Record<string, unknown> = {}

// Previous work order display
const previousWONumber = ref('')

// Pause sheet
const showPauseSheet = ref(false)
const pauseReasonInput = ref('')
const pauseReasonError = ref('')

// Equipment sheet (Misc — multi-select)
const showEquipmentSheet = ref(false)
const draftSelection = ref<string[]>([])
const equipmentTypeFilter = ref('')
const equipmentSearch = ref('')

// Single equipment sheet (PM / Labor Rate)
const showSingleEquipSheet = ref(false)
const singleEquipSearch = ref('')

const filteredSingleEquip = computed(() => {
    const q = singleEquipSearch.value.toLowerCase()
    if (!q) return equipment.value
    return equipment.value.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.customer_unit_id_number ?? '').toLowerCase().includes(q)
    )
})

function openSingleEquipSheet() {
    singleEquipSearch.value = ''
    showSingleEquipSheet.value = true
}

function closeSingleEquipSheet() {
    showSingleEquipSheet.value = false
}

function selectSingleEquip(name: string) {
    singleEquipment.value = name
    showSingleEquipSheet.value = false
}

const equipmentTypeOptions = computed(() =>
    [...new Set(equipment.value.map(e => e.equipment_type).filter(Boolean))]
)

const availableEquipment = computed(() => {
    const q = equipmentSearch.value.toLowerCase()
    return equipment.value.filter(e =>
        !draftSelection.value.includes(e.name) &&
        (!equipmentTypeFilter.value || e.equipment_type === equipmentTypeFilter.value) &&
        (!q || e.name.toLowerCase().includes(q) || e.customer_unit_id_number?.toLowerCase().includes(q))
    )
})

const selectedEquipment = computed(() =>
    equipment.value.filter(e => draftSelection.value.includes(e.name))
)

function equipmentLabel(name: string): string {
    const e = equipment.value.find(eq => eq.name === name)
    if (!e) return name
    return e.customer_unit_id_number ? `${e.name} · ${e.customer_unit_id_number}` : e.name
}

function openEquipmentSheet() {
    draftSelection.value = [...createForm.value.equipment_selection]
    equipmentTypeFilter.value = ''
    equipmentSearch.value = ''
    showEquipmentSheet.value = true
}

function closeEquipmentSheet() {
    showEquipmentSheet.value = false
}

function saveEquipmentSelection() {
    createForm.value.equipment_selection = [...draftSelection.value]
    showEquipmentSheet.value = false
}

function draftAdd(name: string) {
    if (!draftSelection.value.includes(name)) draftSelection.value.push(name)
}

function draftRemove(name: string) {
    draftSelection.value = draftSelection.value.filter(n => n !== name)
}

// Derived status flags
const status = computed(() => swo.value?.status ?? '')
const isEditable = computed(() => ['Repairing', 'Partial Repair'].includes(status.value))
const isLocked = computed(() => ['Staged', 'Completed', 'Billed', 'Issued', 'Closed', 'Cancelled'].includes(status.value))
const showDocumentation = computed(() =>
    ['Repairing', 'Partial Repair', 'Staged', 'Completed', 'Billed', 'Issued', 'Closed'].includes(status.value)
)

// Populate edit form when SWO loads
watch(swo, async (doc) => {
    if (!doc) return
    const snapshot = {
        hour_meter: doc.hour_meter ?? '',
        po_number: doc.po_number ?? '',
        problem_with_lift: doc.problem_with_lift ?? '',
        repair_description: doc.repair_description ?? '',
    }
    editForm.value = { ...snapshot }
    _originalEditForm.value = { ...snapshot }
    localItems.value = (doc.service_items ?? []).map((i) => ({ ...i }))
    _originalItemsJSON = JSON.stringify(localItems.value)
    await nextTick()
    isDirty.value = false
})

// Detect unsaved changes in edit form
watch(editForm, (val) => {
    if (!isEditMode.value) return
    const formChanged = JSON.stringify(val) !== JSON.stringify(_originalEditForm.value)
    const itemsChanged = JSON.stringify(localItems.value) !== _originalItemsJSON
    isDirty.value = formChanged || itemsChanged
}, { deep: true })

// Detect unsaved item changes
watch(localItems, () => {
    if (!isEditMode.value) return
    const formChanged = JSON.stringify(editForm.value) !== JSON.stringify(_originalEditForm.value)
    const itemsChanged = JSON.stringify(localItems.value) !== _originalItemsJSON
    isDirty.value = formChanged || itemsChanged
}, { deep: true })

// ──────────────────────────────────────────────────────────────────────────────
// MODAL LIFECYCLE
// ──────────────────────────────────────────────────────────────────────────────
watch(isOpen, async (open) => {
    if (!open) return
    isDirty.value = false
    actionError.value = ''

    if (!isEditMode.value) {
        loading.value = true
        try {
            const [c, co, me] = await Promise.all([getCustomers(), getCompanies(), getMultiEquipSettings()])
            customers.value = c
            companies.value = co
            multiEquipAllowed.value = me
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
    singleEquipment.value = ''
    equipment.value = []
    swo.value = null
    isDirty.value = false
    showHoursInput.value = false
    hoursInput.value = ''
    hoursError.value = ''
    nextScheduledDate.value = ''
    nextDateError.value = ''
    actionError.value = ''
    showPartSheet.value = false
    sheetItemSearchResults.value = []
    partSheetError.value = ''
    localItems.value = []
    partForm.value = blankPartForm()
    showPauseSheet.value = false
    pauseReasonInput.value = ''
    pauseReasonError.value = ''
    showEquipmentSheet.value = false
    draftSelection.value = []
    equipmentTypeFilter.value = ''
    equipmentSearch.value = ''
    previousWONumber.value = ''
}

async function loadSWO() {
    if (!swoName.value) return
    loading.value = true
    try {
        swo.value = await getSWO(swoName.value)
        if (swo.value?.previous_work_order) {
            previousWONumber.value =
                await getSWOWorkOrderNumber(swo.value.previous_work_order) || swo.value.previous_work_order
        } else {
            previousWONumber.value = ''
        }
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
        close()
        return
    }
    const alert = await alertController.create({
        header: __('Unsaved Changes'),
        message: __('Exit without saving changes?'),
        buttons: [
            { text: __('Cancel'), role: 'cancel' },
            {
                text: __('Exit'),
                role: 'destructive',
                handler: () => {
                    isDirty.value = false
                    close()
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
    equipment.value = []
    equipmentError.value = false

    if (createForm.value.customer) {
        // Parallel fetch: Equipment + Active PO
        await Promise.all([
            fetchEquipment(),
            (async () => {
                const po = await getActiveCustomerPO(createForm.value.customer)
                if (po) createForm.value.po_number = po
            })()
        ])
    }
}

async function onDateChange() {
    createForm.value.equipment_selection = []
    singleEquipment.value = ''
    equipment.value = []
    equipmentError.value = false
    if (createForm.value.customer && createForm.value.scheduled_date) await fetchEquipment()
}

async function fetchEquipment() {
    loadingEquipment.value = true
    equipmentError.value = false
    try {
        equipment.value = await getCustomerEquipment(
            createForm.value.customer,
            createForm.value.scheduled_date,
        )
    } catch {
        equipment.value = []
        equipmentError.value = true
    } finally {
        loadingEquipment.value = false
    }
}

async function handleCreate() {
    actionError.value = ''

    if (!allowsMultiEquip.value) {
        createForm.value.equipment_selection = singleEquipment.value
            ? [singleEquipment.value]
            : []
    }

    const f = createForm.value
    if (!f.customer) { actionError.value = __('Customer is required.'); return }
    if (!f.scheduled_date) { actionError.value = __('Scheduled date is required.'); return }
    if (!f.service_type) { actionError.value = __('Service type is required.'); return }
    if (f.equipment_selection.length === 0) { actionError.value = __('Equipment is required.'); return }

    const company = companies.value[0]?.name ?? ''
    if (!company) { actionError.value = __('No company configured.'); return }

    submitting.value = true
    try {
        await createSWO({
            customer: f.customer,
            company,
            service_type: f.service_type,
            scheduled_date: f.scheduled_date,
            equipment_selection: f.equipment_selection.map((e) => ({ equipment: e })),
            hour_meter: f.hour_meter || undefined,
            po_number: f.po_number || undefined,
        })
        isDirty.value = false
        notifySaved()
        close()
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
    if (!swoName.value) return
    actionError.value = ''
    saving.value = true
    try {
        // Security: verify the current user is still the responsible technician
        const isStillResponsible = await checkResponsibleUser(swoName.value, session.user ?? '')
        if (!isStillResponsible) {
            actionError.value = __('This order has been reassigned. Please reload your list before acting.')
            return
        }
        await updateSWO(swoName.value, {
            hour_meter: editForm.value.hour_meter,
            po_number: editForm.value.po_number,
            problem_with_lift: editForm.value.problem_with_lift,
            repair_description: editForm.value.repair_description,
            service_items: localItems.value,
        })
        isDirty.value = false
        notifyStatusUpdated()
        notifySaved()
        close()
    } catch (err: unknown) {
        actionError.value = extractError(err)
    } finally {
        saving.value = false
    }
}

async function act(newStatus: string) {
    if (!swoName.value) return
    actionError.value = ''
    acting.value = true
    lastAction.value = newStatus
    try {
        // Security: verify the current user is still the responsible technician
        const isStillResponsible = await checkResponsibleUser(swoName.value, session.user ?? '')
        if (!isStillResponsible) {
            actionError.value = __('This order has been reassigned. Please reload your list before acting.')
            return
        }
        await updateSWOStatus(swoName.value, newStatus)
        // Terminal transitions: close the modal; otherwise reload to refresh status
        if (['Staged'].includes(newStatus)) {
            isDirty.value = false
            notifyStatusUpdated()
            notifySaved()
            close()
        } else {
            notifyStatusUpdated()
            await loadSWO()
        }
    } catch (err: unknown) {
        actionError.value = extractError(err)
    } finally {
        acting.value = false
    }
}

async function onSkipSignature() {
    if (!swoName.value) return

    const confirmed = window.confirm(
        __('Are you sure you want to complete this order without a customer signature?')
    )
    if (!confirmed) return

    actionError.value = ''
    acting.value = true
    lastAction.value = 'skip'

    try {
        // We now skip without any attachment, immediately completing the doc
        await updateSWO(swoName.value, {
            signature_skipped: 1,
            status: 'Completed',
        })
        await loadSWO()
        notifyStatusUpdated()
    } catch (err: any) {
        actionError.value = err.message || __('Failed to skip signature.')
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
        status: 'Staged',
        hour_meter: editForm.value.hour_meter,
        po_number: editForm.value.po_number,
        problem_with_lift: editForm.value.problem_with_lift,
        repair_description: editForm.value.repair_description,
        service_items: localItems.value,
    }

    const needsPanel = ['Labor Rate', 'Misc', 'PM Frequency'].includes(swo.value.service_type)
    if (!needsPanel) {
        // Unknown service types: transition directly to Staged
        acting.value = true
        try {
            await updateSWO(swoName.value!, _finishPayload)
            isDirty.value = false
            notifyStatusUpdated()
            notifySaved()
            close()
        } catch (err: unknown) {
            actionError.value = extractError(err)
        } finally {
            acting.value = false
        }
        return
    }

    // Reset panel state
    hoursInput.value = ''
    hoursError.value = ''
    nextScheduledDate.value = ''
    nextDateError.value = ''
    skipScheduling.value = false

    // Pre-fill suggested date based on service type
    if (swo.value.service_type === 'PM Frequency') {
        try {
            const result = await getSuggestedPMDate(swoName.value!)
            nextScheduledDate.value = result.suggested_date || ''
        } catch {
            // leave empty for manual entry
        }
    } else if (swo.value.service_type === 'Misc') {
        try {
            const days = await getMiscDefaultDays()
            const d = new Date()
            d.setDate(d.getDate() + days)
            nextScheduledDate.value = d.toISOString().split('T')[0]
        } catch {
            // leave empty for manual entry
        }
    }

    showHoursInput.value = true
}

async function confirmFinishRepair() {
    hoursError.value = ''
    nextDateError.value = ''

    const serviceType = swo.value?.service_type ?? ''
    const needsHours = ['Labor Rate', 'Misc'].includes(serviceType)
    const needsDate = ['PM Frequency', 'Misc'].includes(serviceType)

    if (needsHours) {
        const hours = parseFloat(hoursInput.value)
        if (!hours || hours <= 0) {
            hoursError.value = __('Please enter a valid number of hours.')
            return
        }
    }

    if (needsDate && !skipScheduling.value && !nextScheduledDate.value) {
        nextDateError.value = __('Next Scheduled Date is required, or enable "Finish without scheduling".')
        return
    }

    acting.value = true
    try {
        const payload: Record<string, unknown> = { ..._finishPayload }

        if (needsHours) {
            payload.hours_worked = parseFloat(hoursInput.value)
        }
        if (needsDate) {
            payload.skip_next_schedule = skipScheduling.value ? 1 : 0
            if (!skipScheduling.value && nextScheduledDate.value) {
                payload.next_scheduled_date = nextScheduledDate.value
            }
        }

        await updateSWO(swoName.value!, payload)
        isDirty.value = false
        showHoursInput.value = false
        notifyStatusUpdated()
        notifySaved()
        close()
    } catch (err: unknown) {
        actionError.value = extractError(err)
        showHoursInput.value = false
    } finally {
        acting.value = false
    }
}

// ── Signature link ────────────────────────────────────────────────────────────
async function onGenerateLink() {
    if (!swoName.value) return
    actionError.value = ''
    acting.value = true
    lastAction.value = 'generate'
    try {
        await generateSignatureLink(swoName.value)
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

// ── Pause sheet ───────────────────────────────────────────────────────────────
function openPauseSheet() {
    pauseReasonInput.value = ''
    pauseReasonError.value = ''
    showPauseSheet.value = true
}

function closePauseSheet() {
    showPauseSheet.value = false
    pauseReasonInput.value = ''
    pauseReasonError.value = ''
}

async function confirmPause() {
    pauseReasonError.value = ''
    if (pauseReasonMandatory.value && !pauseReasonInput.value.trim()) {
        pauseReasonError.value = __('Pause reason is required.')
        return
    }
    acting.value = true
    lastAction.value = 'Partial Repair'
    try {
        await pauseRepair(swoName.value!, pauseReasonInput.value.trim())
        closePauseSheet()
        notifyStatusUpdated()
        await loadSWO()
    } catch (err: unknown) {
        pauseReasonError.value = extractError(err)
        actionError.value = extractError(err)
    } finally {
        acting.value = false
    }
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
        item_code: '',
        part_number: '',
        description: '',
        qty: '1',
        vendor: '',
        attachment: '',
    }
}

function openPartSheet() {
    partForm.value = blankPartForm()
    sheetItemSearchResults.value = []
    partSheetError.value = ''
    showPartSheet.value = true
}

function closePartSheet() {
    showPartSheet.value = false
    sheetItemSearchResults.value = []
    partSheetError.value = ''
    partForm.value = blankPartForm()
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
    partForm.value.item_code = result.name
    partForm.value.part_number = result.custom_component ?? ''
    partForm.value.description = result.description ?? result.item_name ?? ''
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
        item_code: p.is_non_inventory ? undefined : p.item_code || undefined,
        part_number: p.part_number || undefined,
        description: p.description || undefined,
        qty: parsedQty,
        vendor: p.is_non_inventory ? p.vendor || undefined : undefined,
        attachment: p.attachment || undefined,
    })
    closePartSheet()
}

function removeItem(idx: number) {
    localItems.value.splice(idx, 1)
}

// ── Part attachments ──────────────────────────────────────────────────────────
/**
 * Opens the native file picker. On a phone this offers the camera as well, so a
 * technician can photograph the part without leaving the order.
 *
 * `idx` targets an existing row; omit it while adding a part from the sheet.
 */
function pickAttachment(idx: number | null = null) {
    attachTargetIdx.value = idx
    const input = idx === null ? sheetFileInput.value : rowFileInput.value
    if (input) {
        input.value = ''
        input.click()
    }
}

async function onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !swoName.value) return

    const idx = attachTargetIdx.value
    uploadingAttachment.value = true
    partSheetError.value = ''
    actionError.value = ''
    try {
        const uploaded = await uploadFile(file, 'Service Work Order', swoName.value)
        if (idx === null) {
            partForm.value.attachment = uploaded.file_url
        } else {
            localItems.value[idx].attachment = uploaded.file_url
            isDirty.value = true
        }
    } catch (err: unknown) {
        const message = extractError(err)
        if (idx === null) partSheetError.value = message
        else actionError.value = message
    } finally {
        uploadingAttachment.value = false
        attachTargetIdx.value = null
        input.value = ''
    }
}

function removeAttachment(idx: number | null = null) {
    if (idx === null) {
        partForm.value.attachment = ''
    } else {
        localItems.value[idx].attachment = undefined
        isDirty.value = true
    }
}

/** True when the file URL points at something the browser can render inline. */
function isImageAttachment(url: string): boolean {
    return /\.(png|jpe?g|gif|webp)$/i.test(url.split('?')[0])
}

function attachmentName(url: string): string {
    return decodeURIComponent(url.split('/').pop() ?? url)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO(): string {
    return new Date().toISOString().split('T')[0]
}

function toggleEquipment(name: string, checked: boolean) {
    if (checked) {
        if (!createForm.value.equipment_selection.includes(name)) {
            createForm.value.equipment_selection.push(name)
        }
    } else {
        createForm.value.equipment_selection = createForm.value.equipment_selection.filter(n => n !== name)
    }
}

function extractError(err: unknown): string {
    const e = err as { _error_message?: string; message?: string }
    return e?._error_message ?? e?.message ?? __('Action failed. Please try again.')
}

function statusClass(s: string): string {
    const map: Record<string, string> = {
        New: 'bg-cyan-100 text-cyan-700',
        Programmed: 'bg-blue-100 text-blue-800',
        Repairing: 'bg-amber-100 text-amber-800',
        'Partial Repair': 'bg-amber-100 text-amber-800',
        Staged: 'bg-purple-100 text-purple-800',
        Completed: 'bg-green-100 text-green-700',
        Billed: 'bg-emerald-100 text-emerald-800',
        Issued: 'bg-emerald-100 text-emerald-800',
        Closed: 'bg-emerald-100 text-emerald-800',
        Cancelled: 'bg-red-100 text-red-600',
    }
    return map[s] ?? 'bg-slate-100 text-slate-600'
}
</script>

<style scoped>
.custom-ion-item {
    --background: #ffffff;
    --border-radius: 12px;
    --padding-start: 12px;
    --inner-padding-end: 12px;
    margin-bottom: 8px;
    --border-color: #e2e8f0;
}

.equipment-item {
    --background: #ffffff;
    --padding-start: 4px;
}

.action-btn {
    --border-radius: 12px;
    --height: 52px;
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.remove-btn {
    margin: 0;
    --padding-start: 4px;
    --padding-end: 4px;
}

.spinner-small {
    width: 18px;
    height: 18px;
}
</style>
