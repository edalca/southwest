<template>
  <ion-page>

    <!-- Header -->
    <ion-header class="ion-no-border">
      <div class="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <h2 class="text-xl font-bold text-gray-900">{{ __('Work Orders') }}</h2>
        <Button variant="ghost" @click="handleLogout" :title="__('Log out')">
          <FeatherIcon name="log-out" class="h-5 w-5 text-gray-600" />
        </Button>
      </div>
    </ion-header>

    <ion-content>

      <!-- Pull-to-refresh -->
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeletons -->
      <div v-if="swoList.loading" class="space-y-3 p-4">
        <div v-for="n in 4" :key="n" class="animate-pulse rounded-xl bg-white p-4 shadow-sm">
          <div class="mb-2 h-4 w-1/2 rounded bg-gray-200" />
          <div class="mb-1 h-3 w-1/4 rounded bg-gray-100" />
          <div class="h-3 w-2/3 rounded bg-gray-100" />
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="swoList.error" class="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center text-gray-500">
        <FeatherIcon name="alert-circle" class="h-14 w-14 text-red-400" />
        <p>{{ swoList.error.message }}</p>
        <Button variant="outline" @click="swoList.reload()">{{ __('Retry') }}</Button>
      </div>

      <!-- Empty state -->
      <div v-else-if="!swoList.data?.length" class="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center text-gray-500">
        <FeatherIcon name="clipboard" class="h-14 w-14 text-gray-300" />
        <p>{{ __('No work orders assigned to you.') }}</p>
      </div>

      <!-- Order cards -->
      <div v-else class="space-y-3 p-4 pb-24">
        <div
          v-for="order in swoList.data"
          :key="order.name"
          class="cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:shadow-inner"
          @click="router.push(`/swo/${order.name}`)"
        >
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="text-base font-bold text-gray-900">
              {{ order.work_order_number || order.name }}
            </span>
            <Badge :label="__(order.status)" :theme="statusTheme(order.status)" />
          </div>
          <p class="mb-2 text-sm font-medium text-gray-500">{{ __(order.service_type) }}</p>
          <div class="flex items-center gap-4 text-sm text-gray-400">
            <span class="flex items-center gap-1">
              <FeatherIcon name="user" class="h-3.5 w-3.5" />
              {{ order.customer || '—' }}
            </span>
            <span class="flex items-center gap-1">
              <FeatherIcon name="calendar" class="h-3.5 w-3.5" />
              {{ formatDate(order.scheduled_date) }}
            </span>
          </div>
        </div>
      </div>

      <!-- FAB -->
      <div class="fixed bottom-6 right-6 z-10">
        <Button
          variant="solid"
          class="!h-14 !w-14 rounded-full !p-0 shadow-lg"
          :title="__('New Work Order')"
          @click="router.push('/swo/new')"
        >
          <FeatherIcon name="plus" class="h-6 w-6" />
        </Button>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonContent,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'
import { Button, Badge, FeatherIcon, createResource } from 'frappe-ui'
import { formatDate } from '@/utils/date'
import type { session as SessionType } from '@/data/session'

const router = useRouter()
const __ = inject<(t: string) => string>('$translate', (t) => t)
const session = inject<typeof SessionType>('$session')!

// ── Data ──────────────────────────────────────────────────────────────────────
const swoList = createResource({
  url: 'southwest.api.get_technician_swos',
  method: 'GET',
  auto: true,
  onError(error: { exc_type?: string }) {
    if (error?.exc_type === 'AuthenticationError') {
      router.replace({ name: 'Login' })
    }
  },
})

// ── Actions ───────────────────────────────────────────────────────────────────
async function onRefresh(event: CustomEvent) {
  await swoList.reload()
  ;(event.target as HTMLIonRefresherElement).complete()
}

async function handleLogout() {
  await session.logout()
  router.replace('/login')
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
