<template>
    <ion-modal :is-open="isOpen" @did-dismiss="onDismiss"
        style="--width:100%; --height:100%; --max-width:100%; --max-height:100%; --border-radius:0;">

        <ion-header class="ion-no-border">
            <ion-toolbar style="--background:#172554; --color:#fff; --min-height:56px;">
                <ion-buttons slot="start">
                    <ion-button @click="onDismiss" style="--color:rgba(255,255,255,0.65);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </ion-button>
                </ion-buttons>

                <ion-title style="font-size:15px; font-weight:700; color:#fff; letter-spacing:-0.01em;">
                    {{ title }}
                </ion-title>

                <ion-buttons slot="end">
                    <ion-button @click="zoomOut" :disabled="!ready || loading" style="--color:#fff;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </ion-button>
                    <ion-button @click="zoomIn" :disabled="!ready || loading" style="--color:#fff;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </ion-button>
                    <ion-button @click="downloadPdf" :disabled="!pdfBytes || loading" style="--color:#fff;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>

        <ion-content :scroll-y="false">
            <div style="width:100%; height:calc(100vh - 56px); position:relative; background:#525659; overflow:hidden;">

                <div v-if="loading"
                    style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#64748b;z-index:10;">
                    <ion-spinner name="crescent" style="width:36px;height:36px;" />
                    <p style="font-size:13px;">Loading PDF…</p>
                </div>

                <div v-else-if="error"
                    style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;z-index:10;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444"
                        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p style="font-size:13px;color:#dc2626;font-weight:500;">{{ error }}</p>
                    <button @click="load"
                        style="font-size:13px;font-weight:600;color:#1d4ed8;text-decoration:underline;">Retry</button>
                </div>

                <!-- PDFViewer mounts here: outer div scrolls, inner div holds the pages -->
                <div ref="viewerContainer"
                    style="position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;">
                    <div ref="viewer" class="pdfViewer" />
                </div>

            </div>
        </ion-content>

    </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
    IonModal, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonButton, IonContent, IonSpinner,
} from '@ionic/vue'
import * as pdfjsLib from 'pdfjs-dist'
import { EventBus, PDFViewer, PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'
import 'pdfjs-dist/web/pdf_viewer.css'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { getSWOPdfUrl } from '@/services/api'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const props = defineProps<{
    isOpen: boolean
    /** Service Work Order whose print PDF is rendered. Ignored when `fileUrl` is given. */
    name?: string
    /** Renders an already-stored PDF instead, such as a part attachment. */
    fileUrl?: string
    workOrderNumber?: string
    title?: string
}>()

const emit = defineEmits<{ (e: 'dismiss'): void }>()

const loading = ref(false)
const error = ref('')
const ready = ref(false)
const pdfBytes = ref<ArrayBuffer | null>(null)
const viewerContainer = ref<HTMLDivElement | null>(null)
const viewer = ref<HTMLDivElement | null>(null)

let pdfViewer: PDFViewer | null = null

watch(() => props.isOpen, (open) => {
    if (open && (props.fileUrl || props.name)) load()
    else if (!open) destroyViewer()
})

async function load() {
    loading.value = true
    error.value = ''
    ready.value = false
    pdfBytes.value = null
    destroyViewer()

    try {
        const url = props.fileUrl || await getSWOPdfUrl(props.name!)
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        pdfBytes.value = await res.arrayBuffer()
    } catch (err: unknown) {
        const e = err as { _error_message?: string; message?: string }
        error.value = e._error_message ?? e.message ?? 'Failed to load PDF.'
        loading.value = false
        return
    }

    loading.value = false
    await new Promise(r => setTimeout(r, 50))
    await initViewer()
}

async function initViewer() {
    if (!viewerContainer.value || !viewer.value || !pdfBytes.value) return

    const eventBus = new EventBus()
    const linkService = new PDFLinkService({ eventBus })

    pdfViewer = new PDFViewer({
        container: viewerContainer.value,
        viewer: viewer.value,
        eventBus,
        linkService,
        textLayerMode: 1,
    })
    linkService.setViewer(pdfViewer)

    // slice(0) creates a copy so PDF.js can transfer it without detaching pdfBytes
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes.value.slice(0)) }).promise
    pdfViewer.setDocument(pdfDoc)
    linkService.setDocument(pdfDoc)

    eventBus.on('pagesinit', () => {
        pdfViewer!.currentScaleValue = 'page-width'
        ready.value = true
    })
}

function zoomIn() {
    if (!pdfViewer) return
    pdfViewer.currentScale = Math.min(pdfViewer.currentScale + 0.25, 4)
}

function zoomOut() {
    if (!pdfViewer) return
    pdfViewer.currentScale = Math.max(pdfViewer.currentScale - 0.25, 0.25)
}

function destroyViewer() {
    pdfViewer = null
    if (viewer.value) viewer.value.innerHTML = ''
}

function downloadPdf() {
    if (!pdfBytes.value) return
    const blob = new Blob([pdfBytes.value], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.fileUrl
        ? decodeURIComponent(props.fileUrl.split('/').pop() ?? 'attachment.pdf')
        : `Work-Order-${props.workOrderNumber || props.name}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function onDismiss() {
    destroyViewer()
    pdfBytes.value = null
    error.value = ''
    ready.value = false
    emit('dismiss')
}
</script>
