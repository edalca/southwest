import type { App } from 'vue'

type Messages = Record<string, string>

function makeTranslationFunction() {
  let messages: Messages = {}

  async function setup() {
    // In production, frappe.boot.__messages is injected by the page context.
    const w = window as unknown as { frappe?: { boot?: { __messages?: Messages } } }
    if (w.frappe?.boot?.__messages) {
      messages = w.frappe.boot.__messages
      return
    }
    // In dev (decoupled SPA), fetch translations from our own whitelisted endpoint.
    // frappe.translate.load_all_translations is not a public endpoint in Frappe v16.
    try {
      const res = await fetch('/api/method/southwest.api.get_app_translations', {
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      messages = (data?.message as Messages) ?? {}
    } catch {
      // Network error or unauthenticated — stay with English strings.
    }
  }

  function translate(txt: string, replace?: (string | number)[] | Record<string, string>, context?: string): string {
    if (!txt || typeof txt !== 'string') return txt
    let translated = ''
    if (context) translated = messages[`${txt}:${context}`]
    if (!translated) translated = messages[txt] || txt
    if (replace && typeof replace === 'object') {
      if (Array.isArray(replace)) {
        translated = translated.replace(/\{(\d+)\}/g, (_, i) => String(replace[Number(i)] ?? `{${i}}`))
      } else {
        translated = translated.replace(/\{(\w+)\}/g, (_, k) => String((replace as Record<string, string>)[k] ?? `{${k}}`))
      }
    }
    return translated
  }

  return { translate, load: setup }
}

const { translate, load } = makeTranslationFunction()

export const __ = translate

export const translationsPlugin = {
  async isReady() {
    await load()
  },
  install(app: App) {
    app.config.globalProperties.__ = translate
    app.provide('$translate', translate)
  },
}
