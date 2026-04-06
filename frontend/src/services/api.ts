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
}

export async function getSWOs(): Promise<ServiceWorkOrder[]> {
  return getMethod<ServiceWorkOrder[]>('southwest.api.get_technician_swos') ?? []
}

export interface NewSWOPayload {
  customer: string
  company: string
  service_type: string
  scheduled_date: string
  equipment_selection: { equipment: string }[]
  hour_meter?: string
  customer_po_number?: string
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
}

export interface ServiceWorkOrderDetail extends ServiceWorkOrder {
  hour_meter: string
  customer_po_number: string
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
  return resource<ServiceWorkOrderDetail>('GET', `Service Work Order/${encodeURIComponent(name)}`)
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

export async function updateSWO(name: string, data: Record<string, unknown>): Promise<void> {
  await resource<unknown>('PUT', `Service Work Order/${encodeURIComponent(name)}`, { body: data })
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
  customer_po_number?: string
  hour_meter?: string
  problem_with_lift?: string
  repair_description?: string
  equipment_rows?: SignatureEquipmentRow[]
  service_items?: SignatureItem[]
}

const SWO_WHITELIST = 'southwest.service_management.doctype.service_work_order.service_work_order'

export async function getSignaturePageData(token: string): Promise<SignaturePageData> {
  return getMethod<SignaturePageData>(`${SWO_WHITELIST}.get_signature_page_data`, { token })
}

export async function getGuestCsrfToken(): Promise<string> {
  return getMethod<string>(`${SWO_WHITELIST}.get_guest_csrf_token`) ?? ''
}

export async function submitSignature(token: string, signature: string, csrfToken: string): Promise<void> {
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
    body: JSON.stringify({ token, signature }),
  })
  if (!res.ok) throw await buildError(res)
}

export async function generateSignatureLink(docName: string): Promise<string> {
  return getMethod<string>(`${SWO_WHITELIST}.generate_signature_link`, {
    doc_name: docName,
    frontend_base_url: window.location.origin,
  }) ?? ''
}

// ---------------------------------------------------------------------------
// Item search
// ---------------------------------------------------------------------------

export interface ItemResult { name: string; item_name: string; custom_component: string }

export async function searchItems(query: string): Promise<ItemResult[]> {
  if (!query || query.length < 2) return []
  return resource<ItemResult[]>('GET', 'Item', {
    params: {
      fields: JSON.stringify(['name', 'item_name', 'custom_component']),
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

export interface Equipment { name: string; customer_unit_id_number: string; make: string; model: string; serial_no: string }

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
// User preferences
// ---------------------------------------------------------------------------

export async function getDateFormat(): Promise<string> {
  return (await getMethod<string>('southwest.api.get_date_format')) || 'dd-mm-yyyy'
}
