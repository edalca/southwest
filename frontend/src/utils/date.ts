// ---------------------------------------------------------------------------
// Date formatting utility — backed by the user's Frappe date format setting.
//
// Call loadDateFormat() once in main.ts after the session is confirmed.
// All subsequent formatDate() calls are synchronous.
//
// Frappe format notation uses: dd  mm  yyyy
// Examples: "dd-mm-yyyy"  "mm/dd/yyyy"  "yyyy-mm-dd"  "dd.mm.yyyy"
// ---------------------------------------------------------------------------

let _format = 'dd-mm-yyyy'; // safe default matching Frappe system default

/**
 * Store the user's date format fetched from Frappe.
 * Call this once from main.ts bootstrap.
 */
export function setDateFormat(format: string): void {
  if (format) _format = format;
}

/** Return the currently loaded date format string. */
export function getLoadedDateFormat(): string {
  return _format;
}

/**
 * Format an ISO date string (YYYY-MM-DD) using the Frappe format.
 * Accepts full ISO datetimes too — time part is ignored.
 * Returns '—' for empty or invalid input.
 *
 * @param isoDate  - "2026-04-04" or "2026-04-04T00:00:00"
 * @param override - optional format override (uses loaded format when omitted)
 */
export function formatDate(isoDate: string | undefined | null, override?: string): string {
  if (!isoDate) return '—';
  const datePart = isoDate.split('T')[0];
  const [yyyy, mm, dd] = datePart.split('-');
  if (!yyyy || !mm || !dd) return isoDate; // return as-is if unparseable
  return (override ?? _format)
    .replace('yyyy', yyyy)
    .replace('mm', mm)
    .replace('dd', dd);
}
