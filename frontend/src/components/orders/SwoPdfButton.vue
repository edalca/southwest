<template>
    <template v-if="visible">
        <button
            @click="showViewer = true"
            style="
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: #172554;
                color: #fff;
                border-radius: 8px;
                padding: 14px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 1px 3px rgba(0,0,0,.2);
                transition: opacity .15s;
            "
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
            {{ __('View Work Order PDF') }}
        </button>

        <WorkOrderPdfView
            :is-open="showViewer"
            :name="name"
            :work-order-number="workOrderNumber"
            :title="`Work Order — ${workOrderNumber || name}`"
            @dismiss="showViewer = false"
        />
    </template>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import WorkOrderPdfView from '@/components/orders/WorkOrderPdfView.vue'

const props = defineProps<{
    status: string
    name: string
    workOrderNumber?: string
}>()

const __ = inject<(t: string) => string>('$translate', (t) => t)

const showViewer = ref(false)
const visible = computed(() => ['Staged', 'Completed'].includes(props.status))
</script>
