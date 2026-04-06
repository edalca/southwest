// ---------------------------------------------------------------------------
// Translation utility — backed by Frappe's translation system.
//
// On app bootstrap, call loadTranslations() once.
// It detects the system language, fetches the translation dict from Frappe,
// and caches it. All subsequent _() calls are instant (synchronous).
//
// Usage:
//   import { _ } from '@/utils/i18n';
//   _('Customer is required.')
//   _('Hello {0}, you have {1} orders', name, count)
// ---------------------------------------------------------------------------

let _translations: Record<string, string> = {};

/**
 * Fetch the system language from Frappe and load its translation dict.
 * Call this once in main.ts before mounting the app.
 * Fails silently — falls back to the original English strings.
 */
export async function loadTranslations(): Promise<void> {
  try {
    // Uses the southwest whitelist which handles language detection internally
    // and calls frappe.translate.get_all_translations server-side.
    const res = await fetch('/api/method/southwest.api.get_app_translations', {
      credentials: 'include',
    });
    if (!res.ok) return;
    const data = await res.json();
    _translations = (data?.message as Record<string, string>) ?? {};
  } catch {
    // Network error or not logged in yet — stay with English.
  }
}

/**
 * Return the Frappe-translated string for `text`.
 * Falls back to `text` itself when no translation is found.
 * Supports positional placeholders: _('Hello {0}', name)
 */
export function _(text: string, ...args: (string | number)[]): string {
  let result = _translations[text] ?? text;
  args.forEach((arg, i) => {
    result = result.replaceAll(`{${i}}`, String(arg));
  });
  return result;
}
