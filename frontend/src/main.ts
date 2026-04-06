import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'
import '@ionic/vue/css/core.css'

import {
  setConfig,
  frappeRequest,
  resourcesPlugin,
  Button,
  Input,
  FormControl,
} from 'frappe-ui'

import { translationsPlugin } from '@/plugins/translationsPlugin'
import { setDateFormat } from '@/utils/date'
import { session } from '@/data/session'
import { initPWA } from '@/pwa'

import './theme/variables.css'
import './main.css'

type FrappeWindow = {
  frappe?: Record<string, unknown>
  csrf_token?: string
}

async function bootstrap() {
  initPWA()
  const w = window as unknown as FrappeWindow

  // In dev, bootstrap frappe.boot context via GET (no CSRF required).
  // Must use plain fetch — frappeRequest always defaults to POST.
  // This sets window.csrf_token so subsequent POST calls (login, etc.) work.
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/api/method/southwest.api.get_context_for_dev', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        const boot = data.message as Record<string, unknown>
        if (!w.frappe) w.frappe = {}
        w.frappe.boot = boot
        if (typeof boot.csrf_token === 'string') w.csrf_token = boot.csrf_token
      }
    } catch {
      // Guest session or developer_mode off
    }
  }

  // Load translations (uses boot.__messages if available, else calls our whitelist).
  await translationsPlugin.isReady()

  // Load user date format from boot context or fallback API call.
  try {
    const fmt = (w.frappe?.boot as Record<string, unknown> | undefined)?.date_format as string | undefined
    if (fmt) {
      setDateFormat(fmt)
    } else {
      const { getDateFormat } = await import('@/services/api')
      const format = await getDateFormat()
      setDateFormat(format)
    }
  } catch {
    // Fall back to default dd-mm-yyyy.
  }

  setConfig('resourceFetcher', frappeRequest)

  const app = createApp(App)

  app.use(resourcesPlugin)
  app.use(translationsPlugin)
  app.use(IonicVue, { mode: 'ios' })
  app.use(router)

  app.component('Button', Button)
  app.component('Input', Input)
  app.component('FormControl', FormControl)

  app.provide('$session', session)

  await router.isReady()
  app.mount('#app')
}

bootstrap()
