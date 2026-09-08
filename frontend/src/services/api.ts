import { call } from 'frappe-ui'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Typed window with Frappe globals. */
const w = window as unknown as { csrf_token?: string }

/** GET request to a Frappe whitelist method (query-string params). */
async function getMethod<T>(method: string, params?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Frappe-Site-Name': window.location.hostname,
  }
  if (w.csrf_token && w.csrf_token !== '{{ csrf_token }}') {
    headers['X-Frappe-CSRF-Token'] = w.csrf_token
  }
  const base = method.startsWith('/') ? method : `/api/method/${method}`
  const url = params ? `${base}?${new URLSearchParams(params)}` : base
  const res = await fetch(url, { headers, credentials: 'include' })
  if (!res.ok) throw await buildError(res)
  const data = await res.json()
  return data.message as T
}

/** REST resource request — GET/POST/PUT on /api/resource/:doctype[/:name]. */
async function resource<T>(
  method: string,
  path: string,
  options?: { params?: Record<string, string>; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Frappe-Site-Name': window.location.hostname,
  }
  if (w.csrf_token && w.csrf_token !== '{{ csrf_token }}') {
    headers['X-Frappe-CSRF-Token'] = w.csrf_token
  }
  let url = `/api/resource/${path}`
  if (options?.params) url += `?${new URLSearchParams(options.params)}`
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) throw await buildError(res)
  const data = await res.json()
  return data.data as T
}

async function buildError(res: Response): Promise<Error> {
  let body: Record<string, unknown> = {}
  try { body = await res.json() } catch { /* ignore */ }
  const msg = (body._error_message ?? body.exception ?? `HTTP ${res.status}`) as string
  const e = new Error(msg) as Error & { _error_message?: string; _server_messages?: unknown }
  e._error_message = body._error_message as string | undefined
  return e
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface UploadedFile {
  file_url: string
  file_name: string
}

/**
 * Uploads a file through Frappe's `upload_file` endpoint and attaches it to the
 * given document. Photos taken on a phone are optimized server-side so they do
 * not blow up the site's disk usage.
 *
 * The File record is attached to the parent document rather than to a child row,
 * which mirrors what the Desk attach control does for fields inside a grid, and
 * keeps permission checks anchored on a doctype the user can actually read.
 */
export async function uploadFile(
  file: File,
  doctype: string,
  docname: string,
  isPrivate = true,
): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('doctype', doctype)
  form.append('docname', docname)
  form.append('is_private', isPrivate ? '1' : '0')
  form.append('optimize', '1')
  form.append('max_width', '1600')
  form.append('max_height', '1600')

  // Content-Type is intentionally omitted so the browser sets the multipart boundary.
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Frappe-Site-Name': window.location.hostname,
  }
  if (w.csrf_token && w.csrf_token !== '{{ csrf_token }}') {
    headers['X-Frappe-CSRF-Token'] = w.csrf_token
  }

  const res = await fetch('/api/method/upload_file', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  })
  if (!res.ok) throw await buildError(res)
  const data = await res.json()
  return data.message as UploadedFile
}

// ---------------------------------------------------------------------------
// Session / Auth
// ---------------------------------------------------------------------------

/** Init CSRF token into window.csrf_token (used by frappe-ui's call/frappeRequest). */
export async function initSession(): Promise<void> {
  try {
    const token = await getMethod<string>('southwest.api.get_csrf_token')
    if (token) w.csrf_token = token
  } catch {
    // Not logged in yet.
  }
}

export async function login(usr: string, pwd: string): Promise<void> {
  await call('login', { usr, pwd })
  await initSession()
}

export async function getLoggedUser(): Promise<string> {
  return getMethod<string>('frappe.auth.get_logged_user')
}

export async function logout(): Promise<void> {
  await getMethod<void>('logout')
}

// ---------------------------------------------------------------------------
// Service Work Orders
// ---------------------------------------------------------------------------

export interface ServiceWorkOrder {
  name: string
  work_order_number: string
  status: string
  customer: string
  scheduled_date: string
  service_type: string
  /** The technician currently responsible for this order (controls mobile app visibility). */
  responsible_user: string
  /** Server-calculated time since last modification in minutes. */
  time_ago_minutes: number
  /** ISO timestamp of last modification. */
  modified: string
}

export async function getSWOs(hoursLimit?: number): Promise<ServiceWorkOrder[]> {
  const params: Record<string, string> = {}
  if (hoursLimit !== undefined) params.hours_limit = String(hoursLimit)
  return getMethod<ServiceWorkOrder[]>('southwest.api.get_technician_swos', params) ?? []
}

export interface NewSWOPayload {
  customer: string
  company: string
  service_type: string
  scheduled_date: string
  equipment_selection: { equipment: string }[]
  hour_meter?: string
  po_number?: string
}

export async function createSWO(data: NewSWOPayload): Promise<string> {
  const doc = await resource<{ name: string }>('POST', 'Service Work Order', { body: data })
  return doc.name
}

export interface SWOItem {
  name?: string
  is_non_inventory_part: number
  item_code?: string
  part_number?: string
  description?: string
  qty: number
  vendor?: string
  /**
   * File URLs of the photos or documents attached to this part row.
   *
   * The doctype stores this as a JSON string in `attachments`; `getSWO` parses it
   * on the way in and `serviceItemsPayload` serializes it on the way out, so the
   * rest of the app only ever sees an array.
   */
  attachments?: string[]
}

/**
 * Reads the raw `attachments` value of a part row.
 *
 * Rows created before multi-file support hold a bare URL rather than a JSON
 * array, so both shapes are accepted.
 */
export function parseRowAttachments(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((u): u is string => Boolean(u))
  const value = String(raw).trim()
  if (!value.startsWith('[')) {
    // Legacy single-file rows held a bare Attach path.
    return value.startsWith('/') || value.startsWith('http') ? [value] : []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((u): u is string => Boolean(u)) : []
  } catch {
    return []
  }
}

/** Converts part rows back into the shape the Frappe REST API expects. */
export function serviceItemsPayload(items: SWOItem[]): Record<string, unknown>[] {
  return items.map(({ attachments, ...rest }) => ({
    ...rest,
    attachments: attachments?.length ? JSON.stringify(attachments) : '',
  }))
}

/** Maximum files allowed per part row, from Service Manager Settings. */
export async function getMaxPartAttachments(): Promise<number> {
  const res = await getMethod<{ max_part_attachments: number }>(
    'southwest.api.get_max_part_attachments',
  )
  return res?.max_part_attachments || 5
}

export interface ServiceWorkOrderDetail extends ServiceWorkOrder {
  hour_meter: string
  po_number: string
  previous_work_order: string
  hours_worked: number
  service_cost: number
  problem_with_lift: string
  repair_description: string
  signature_token: string
  signature_link: string
  equipment_selection: { name: string; equipment: string }[]
  service_items: SWOItem[]
}

export async function getSWO(name: string): Promise<ServiceWorkOrderDetail> {
  const doc = await resource<ServiceWorkOrderDetail>(
    'GET',
    `Service Work Order/${encodeURIComponent(name)}`,
  )
  for (const item of doc.service_items ?? []) {
    item.attachments = parseRowAttachments(item.attachments)
  }
  return doc
}

export async function updateSWOStatus(
  name: string,
  status: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await resource<unknown>('PUT', `Service Work Order/${encodeURIComponent(name)}`, {
    body: { status, ...extra },
  })
}

export async function getSWOWorkOrderNumber(name: string): Promise<string> {
  const doc = await resource<{ work_order_number: string }>(
    'GET',
    `Service Work Order/${encodeURIComponent(name)}`,
    { params: { fields: JSON.stringify(['work_order_number']) } },
  )
  return doc.work_order_number ?? ''
}

export async function updateSWO(name: string, data: Record<string, unknown>): Promise<void> {
  await resource<unknown>('PUT', `Service Work Order/${encodeURIComponent(name)}`, { body: data })
}

/**
 * Fetches the current `responsible_user` from the server and checks whether
 * it still matches the given `currentUser`. Returns `true` if the user is
 * still responsible; `false` if the order has been reassigned.
 *
 * Call this before any critical write action in the mobile app so technicians
 * cannot act on orders that a manager has reassigned from the Desk.
 */
export async function checkResponsibleUser(
  name: string,
  currentUser: string,
): Promise<boolean> {
  const doc = await resource<{ responsible_user: string }>('GET', `Service Work Order/${encodeURIComponent(name)}`, {
    params: { fields: JSON.stringify(['responsible_user']) },
  })
  return doc.responsible_user === currentUser
}

// ---------------------------------------------------------------------------
// Shared Agenda
// ---------------------------------------------------------------------------

export interface AgendaSubscriber {
  name?: string
  user: string
  added_by?: string
  added_on?: string
}

export interface AgendaAlert {
  name?: string
  remind_before: number
  remind_before_unit: 'Minutes' | 'Hours' | 'Days'
  alert_datetime?: string
  sent?: number
  sent_on?: string
}

export interface AgendaEntry {
  name: string
  subject: string
  entry_type: 'Event' | 'Task' | 'Reminder'
  status: 'Open' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High'
  starts_on: string
  ends_on?: string
  all_day: number
  customer?: string
  description?: string
  owner: string
  creation?: string
  modified?: string
  subscribers: string[] | AgendaSubscriber[]
  alerts?: AgendaAlert[]
  is_subscribed: boolean
  can_edit?: boolean
}

export interface AgendaUser {
  name: string
  full_name: string
  user_image?: string
}

const AGENDA_METHOD = 'southwest.service_management.doctype.agenda_entry.agenda_entry'

export async function getAgendaEntries(
  start?: string,
  end?: string,
  subscribedOnly = false,
): Promise<AgendaEntry[]> {
  const params: Record<string, string> = { subscribed_only: subscribedOnly ? '1' : '0' }
  if (start) params.start = start
  if (end) params.end = end
  return await getMethod<AgendaEntry[]>(`${AGENDA_METHOD}.get_agenda_entries`, params) ?? []
}

export async function getAgendaEntry(name: string): Promise<AgendaEntry> {
  return getMethod<AgendaEntry>(`${AGENDA_METHOD}.get_agenda_entry`, { name })
}

export async function createAgendaEntry(data: Record<string, unknown>): Promise<string> {
  const doc = await resource<{ name: string }>('POST', 'Agenda Entry', { body: data })
  return doc.name
}

export async function updateAgendaEntry(
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  await resource<unknown>('PUT', `Agenda Entry/${encodeURIComponent(name)}`, { body: data })
}

export async function toggleAgendaSubscription(name: string, subscribe: boolean): Promise<boolean> {
  const result = await call(`${AGENDA_METHOD}.toggle_agenda_subscription`, {
    name,
    subscribe: subscribe ? 1 : 0,
  }) as { is_subscribed?: boolean } | undefined
  return result?.is_subscribed ?? subscribe
}

export async function getAgendaUsers(): Promise<AgendaUser[]> {
  return await getMethod<AgendaUser[]>(`${AGENDA_METHOD}.get_agenda_users`) ?? []
}

export async function getUpcomingAgenda(days = 7, limit = 20): Promise<AgendaEntry[]> {
  return await getMethod<AgendaEntry[]>(`${AGENDA_METHOD}.get_upcoming_agenda`, {
    days: String(days),
    limit: String(limit),
  }) ?? []
}

// ---------------------------------------------------------------------------
// Signature flow
// ---------------------------------------------------------------------------

export interface SignatureEquipmentRow { make: string; model: string; serial_no: string; unit: string }
export interface SignatureItem { label: string; description: string; qty: number }
export interface SignaturePageData {
  expired?: boolean
  already_signed?: boolean
  company_name?: string
  company_logo?: string
  company_phone?: string
  company_email?: string
  work_order_number?: string
  customer?: string
  service_type?: string
  scheduled_date?: string
  po_number?: string
  hour_meter?: string
  problem_with_lift?: string
  repair_description?: string
  equipment_rows?: SignatureEquipmentRow[]
  service_items?: SignatureItem[]
  allow_skip_signature?: number
}

const SWO_WHITELIST = 'southwest.service_management.doctype.service_work_order.service_work_order'

export async function getSignaturePageData(token: string): Promise<SignaturePageData> {
  return getMethod<SignaturePageData>(`${SWO_WHITELIST}.get_signature_page_data`, { token })
}

export async function getGuestCsrfToken(): Promise<string> {
  return getMethod<string>(`${SWO_WHITELIST}.get_guest_csrf_token`) ?? ''
}

export async function submitSignature(
  token: string,
  signature: string | null,
  csrfToken: string,
  skipped = 0,
  paperSignature?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Frappe-Site-Name': window.location.hostname,
    'X-Frappe-CSRF-Token': csrfToken,
  }
  const res = await fetch(`/api/method/${SWO_WHITELIST}.submit_signature`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token, signature, skipped, paper_signature: paperSignature }),
  })
  if (!res.ok) throw await buildError(res)
}

export async function generateSignatureLink(docName: string): Promise<string> {
  return getMethod<string>(`${SWO_WHITELIST}.generate_signature_link`, {
    doc_name: docName,
  }) ?? ''
}

export async function skipSignatureMobile(docName: string, paperSignature: string): Promise<void> {
  await getMethod(`${SWO_WHITELIST}.desk_skip_signature`, {
    doc_name: docName,
    paper_signature: paperSignature,
  })
}

// ---------------------------------------------------------------------------
// Item search
// ---------------------------------------------------------------------------

export interface ItemResult {
  name: string
  item_name: string
  custom_component: string
  description: string
}

export async function searchItems(query: string): Promise<ItemResult[]> {
  if (!query || query.length < 2) return []
  return resource<ItemResult[]>('GET', 'Item', {
    params: {
      fields: JSON.stringify(['name', 'item_name', 'custom_component', 'description']),
      filters: JSON.stringify([
        ['is_stock_item', '=', 1],
        ['disabled', '=', 0],
        ['name', 'like', `%${query}%`],
      ]),
      limit_page_length: '15',
      order_by: 'name asc',
    },
  }) ?? []
}

// ---------------------------------------------------------------------------
// Customers / Equipment / Companies
// ---------------------------------------------------------------------------

export interface Customer { name: string; customer_name: string }

export async function getCustomers(): Promise<Customer[]> {
  return resource<Customer[]>('GET', 'Customer', {
    params: {
      fields: JSON.stringify(['name', 'customer_name']),
      order_by: 'customer_name asc',
      limit_page_length: '500',
    },
  }) ?? []
}

export async function getActiveCustomerPO(customer: string): Promise<string | null> {
  if (!customer) return null
  try {
    return await getMethod<string>('southwest.api.get_active_customer_po', { customer })
  } catch {
    return null
  }
}

export interface Equipment { name: string; customer_unit_id_number: string; equipment_type: string; make: string; model: string; serial_no: string }

export async function getCustomerEquipment(customer: string, scheduledDate: string): Promise<Equipment[]> {
  return getMethod<Equipment[]>('southwest.api.get_customer_equipment', {
    customer,
    scheduled_date: scheduledDate,
  }) ?? []
}

export interface Company { name: string }

export async function getCompanies(): Promise<Company[]> {
  return resource<Company[]>('GET', 'Company', {
    params: { fields: JSON.stringify(['name']), limit_page_length: '50' },
  }) ?? []
}

// ---------------------------------------------------------------------------
// Attendance / Employee Check-in
// ---------------------------------------------------------------------------

export interface AttendanceStatus {
  employee: string | null
  last_log_type: string | null
  last_log_time: string | null
  checked_in: boolean
}

export async function getAttendanceStatus(): Promise<AttendanceStatus> {
  return getMethod<AttendanceStatus>('southwest.api.get_attendance_status')
}

export async function getMiscDefaultDays(): Promise<number> {
  const res = await getMethod<{ misc_default_days: number }>('southwest.api.get_misc_default_days')
  return res.misc_default_days ?? 90
}

export async function getMultiEquipSettings(): Promise<string[]> {
  const res = await getMethod<string[]>('southwest.api.get_multi_equipment_settings')
  return res ?? []
}

export async function getSuggestedPMDate(doc_name: string): Promise<{ suggested_date: string }> {
  return getMethod<{ suggested_date: string }>('southwest.api.get_suggested_pm_date', { doc_name })
}

export async function getPauseReasonMandatory(): Promise<boolean> {
  const res = await getMethod<{ pause_reason_mandatory: number }>('southwest.api.get_pause_reason_mandatory')
  return !!(res?.pause_reason_mandatory)
}

export async function pauseRepair(name: string, reason: string): Promise<void> {
  await call('southwest.api.pause_repair', { swo_name: name, reason })
}

export async function addCheckinLog(
  log_type: 'IN' | 'OUT',
  latitude: number,
  longitude: number,
): Promise<void> {
  await call('southwest.api.add_checkin_log', { log_type, latitude, longitude })
}

export interface CheckinLog {
  name: string
  log_type: 'IN' | 'OUT'
  time: string
}

export async function getTodayCheckinLogs(employee: string): Promise<CheckinLog[]> {
  const today = new Date().toISOString().split('T')[0]
  return resource<CheckinLog[]>('GET', 'Employee Checkin', {
    params: {
      fields: JSON.stringify(['name', 'log_type', 'time']),
      filters: JSON.stringify([
        ['employee', '=', employee],
        ['time', '>=', `${today} 00:00:00`],
      ]),
      order_by: 'time desc',
      limit_page_length: '20',
    },
  }) ?? []
}

export interface AttendanceRecord {
  name: string
  attendance_date: string
  status: 'Present' | 'Absent' | 'Half Day' | 'On Leave'
}

export async function getMonthlyAttendance(
  employee: string,
  year: number,
  month: number,
): Promise<AttendanceRecord[]> {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const from = `${year}-${mm}-01`
  const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
  return resource<AttendanceRecord[]>('GET', 'Attendance', {
    params: {
      fields: JSON.stringify(['name', 'attendance_date', 'status']),
      filters: JSON.stringify([
        ['employee', '=', employee],
        ['attendance_date', '>=', from],
        ['attendance_date', '<=', to],
        ['docstatus', '=', 1],
      ]),
      limit_page_length: '35',
    },
  }) ?? []
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export async function getDateFormat(): Promise<string> {
  return (await getMethod<string>('southwest.api.get_date_format')) || 'dd-mm-yyyy'
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Returns the Frappe download URL for the Service Work Order PDF.
 * Only succeeds when the SWO status is Staged or Completed.
 */
export async function getSWOPdfUrl(name: string): Promise<string> {
  return getMethod<string>('southwest.api.get_swo_pdf_url', { name }) ?? ''
}

export async function enqueueSWOPdf(name: string): Promise<string> {
  return getMethod<string>('southwest.api.enqueue_swo_pdf', { name }) ?? ''
}

export async function getSWOPdfStatus(cacheKey: string): Promise<{ status: string; message?: string }> {
  return (getMethod('southwest.api.get_swo_pdf_status', { cache_key: cacheKey }) as Promise<{ status: string; message?: string }>) ?? { status: 'pending' }
}
