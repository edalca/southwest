# Southwest App - Development Log

**App:** `southwest`
**Publisher:** Edwin Carrillo
**Description:** Custom adaptation for Southwest company built on top of ERPNext + HRMS
**Frappe Version:** 16
**Dependencies:** ERPNext, HRMS




## Stack

- **Framework:** Frappe Framework v16
- **Base Apps:** ERPNext, HRMS
- **Customization type:** Custom modules + existing doctype customizations




## Project Structure

```
southwest/
  setup.py                        â† after_install / before_uninstall orchestrator
  hooks.py
  overrides/                      â† Python event handlers for ERPNext/HRMS doctypes
    __init__.py
    item_events.py                â† validate: enforces required fields when is_stock_item=1
    sales_invoice_events.py       â† before_insert: assigns custom_company_sequence
                                     on_submit: sets linked SWO to Invoiced
  www/                            â† Legacy Jinja pages (kept but not used for signature)
    swo_signature.py
    swo_signature.html
  startup/                        â† setup helpers called from setup.py
    __init__.py
    custom_fields.py              â† create/delete custom fields on ERPNext doctypes
    property_setters.py           â† apply/remove Property Setters on ERPNext/HRMS doctypes
  utils/                          â† Shared utility modules
    __init__.py
    sequence.py                   â† get_next_sequence() â€” generic numeric sequence generator
  service_management/             â† Service Management module
    doctype/
      make/                       â† Make DocType (master)
        make.json
        make.py
      equipment/                  â† Equipment DocType
        equipment.json
        equipment.py              â† before_insert: equipment_number; autoname: {customer_code}-{make}/{model}/{serial_no}
        equipment.js
      sequence/                   â† Sequence DocType â€” stores named counters
        sequence.json
        sequence.py
      service_contract/           â† Service Contract (submittable, SC-.YY.-#####)
        service_contract.json
        service_contract.py       â† before_insert: contract_number; on_submit: creates assignments; on_cancel: deactivates them
        service_contract.js       â† filters equipment by customer; clears on customer change
      service_contract_equipment/ â† Child table for Service Contract equipment rows
        service_contract_equipment.json
        service_contract_equipment.py
      service_equipment_assignment/ â† Operational record per machine (SA-.YY.-#####)
        service_equipment_assignment.json
        service_equipment_assignment.py
        service_equipment_assignment.js â† frm.disable_save() hides Save button
      service_manager_settings/   â† Single DocType for app configuration
        service_manager_settings.json
        service_manager_settings.py
        service_manager_settings.js â† set_query: labor items filtered to is_stock_item=0
      service_work_order/         â† Service Work Order (non-submittable, WO-.YY.-.#######)
        service_work_order.json
        service_work_order.py     â† before_insert: work_order_number; validate: cost calc;
                                     get_valid_equipment_for_customer, update_customer_po_number,
                                     complete_work_order, create_programmed_order, resolve_and_create_invoice
        service_work_order.js     â† status buttons, time tracking, form locking, invoicing
        service_work_order_list.js â† list view status indicator
      service_work_order_equipment/ â† Child table (Table MultiSelect) for SWO equipment
        service_work_order_equipment.json
        service_work_order_equipment.py
      service_work_order_item/    â† Child: parts/items per work order
        service_work_order_item.json
        service_work_order_item.py
      service_work_order_time_log/ â† Child: time tracking entries
        service_work_order_time_log.json
        service_work_order_time_log.py
    page/
      service_manager_dashboard/  â† Operational dashboard Page
        service_manager_dashboard.json  â† Page definition (role: System Manager)
        service_manager_dashboard.py    â† get_dashboard_data() whitelist â€” one call returns KPIs + table rows
        service_manager_dashboard.js    â† Full pure-JS page: inject_smd_styles(), build_smd_html(), render_smd_kpis(), render_smd_table(); on_page_load / on_page_show; Refresh button
        service_manager_dashboard.html  â† Empty (layout injected entirely via JS â€” no template engine used)
    print_format/
      service_work_order/
        service_work_order.json   â† Print Format definition (standard)
        service_work_order.html   â† Jinja template (read at runtime)
    report/
      service_work_orders/
        service_work_orders.json  â† Report definition
        service_work_orders.py    â† Script Report logic
        service_work_orders.js    â† Report filters
    workspace_sidebar/
      service_management.json     â† Sidebar links for the Service Management module
  public/
    js/
      southwest.bundle.js         â† Entry point; exports southwest.utils.*
      utils/
        company.js                â† southwest.utils.set_default_company(frm)
      overrides/                  â† JS client scripts for ERPNext/HRMS doctypes
        item.js                   â† toggle Southwest fields; auto-generate item_code
    signature/
      index.html                  â† SPA for customer signature (tablet/mobile, no login required)
                                     Served at /assets/southwest/signature/?token=...
  .vscode/
    settings.json                 â† Python interpreter + extraPaths for frappe/erpnext/hrms
frontend/                         â† Ionic Vue 3 mobile app for field technicians (decoupled frontend)
  vite.config.ts                  â† Vite config; /api proxy â†’ http://localhost:8000 for dev
  ionic.config.json               â† Ionic project config (type: vue)
  package.json                    â† Dependencies: @ionic/vue, vue-router, axios, @capacitor/core
  src/
    App.vue                       â† Root: <ion-app> + <ion-router-outlet> only
    main.ts                       â† App bootstrap; registers IonicVue plugin
    services/
      api.ts                      â† axios client (withCredentials:true); login(), getLoggedUser(),
                                     logout(), getSWOs()
    router/
      index.ts                    â† Routes /login + /swo; beforeEach guard calls getLoggedUser()
                                     to protect routes and redirect Guest â†’ /login
    views/
      LoginPage.vue               â† Login form (IonInput, IonButton); error handling; redirects to /swo
      SWOPage.vue                 â† Work order list (IonCard per order); ion-refresher; logout button
                                     Status badge colored via statusColor() map
```




## Modules

| Module | Status | Description |
|---


## Doctype Customizations (ERPNext/HRMS)

| Doctype | Added Fields | Scripts | Status |
|---


## Custom Doctypes

| Doctype | Module | Description | Status |
|---


## Custom Doctypes â€” Field Detail

### Equipment
| Field | Type | Notes |
|---


## Configured Hooks

| Hook | Value | Purpose |
|---


## Patches / Migrations

| Date | Patch | Description |
|---


## Changelog

### 2026-04-04 (Frappe UI migration)
- **Mobile frontend â€” Migrated from pure Ionic UI to Frappe UI + Tailwind CSS** (same pattern as HRMS):
  - **Architecture**: Ionic retained only for page shell (`ion-page`, `ion-content`, `ion-header`, `ion-refresher`); all UI components replaced with Frappe UI + Tailwind
  - **Packages added**: `frappe-ui@0.1.271`, `tailwindcss@3`, `postcss`, `autoprefixer`, `feather-icons`, `dayjs`; removed `axios`, `@capacitor/*`
  - **New config files**: `tailwind.config.js` (uses `frappe-ui/src/tailwind/preset`), `postcss.config.cjs`, `src/main.css` (Tailwind directives)
  - **`vite.config.ts`** â€” Added `frappeui()` plugin; removed legacy plugin; port set to 8100 via `server.host`
  - **`tsconfig.json`** â€” Changed `moduleResolution` from `Node` to `bundler` to resolve frappe-ui types
  - **`src/plugins/translationsPlugin.ts`** â€” New plugin (ported from HRMS): fetches `frappe.translate.load_all_translations`, provides `__()` via `app.provide('$translate', ...)` and `app.config.globalProperties.__`
  - **`src/main.ts`** â€” Rewritten: `setConfig('resourceFetcher', frappeRequest)`, `resourcesPlugin`, `translationsPlugin`; dev mode fetches `get_context_for_dev` to populate `window.csrf_token` and boot data
  - **`src/services/api.ts`** â€” Rewritten without axios: `getMethod()` helper for GET whitelist calls, `resource()` helper for REST CRUD (`/api/resource/...`); CSRF token read from `window.csrf_token` (set by frappe-ui); `call` from frappe-ui used for login POST
  - **`src/views/LoginPage.vue`** â€” `FormControl` + `Button` + `FeatherIcon`; Tailwind layout; `__()` via inject
  - **`src/views/SWOPage.vue`** â€” Tailwind cards replacing `IonCard`; `Badge` for status; `FeatherIcon`; FAB as fixed `Button`
  - **`src/views/CreateSWOPage.vue`** â€” `Select` for customer/service type/equipment; `DatePicker` replaces `IonDatetimeButton`; `LoadingIndicator`; checkbox list for Misc multi-equipment
  - **`src/views/SWODetailPage.vue`** â€” Full rewrite: Tailwind sections; `Dialog` replaces `alertController`; `Switch` replaces `IonToggle`; `Textarea`; `LoadingIndicator`; inline `InfoRow` helper component
  - **`src/views/SignaturePage.vue`** â€” State screens rewritten with Tailwind + `FeatherIcon` + `LoadingIndicator`; document section keeps scoped CSS (formal print look); removed Ionic icons/spinner
  - **`southwest/api.py`** â€” Added `get_context_for_dev()` whitelist (allow_guest, POST, developer_mode only): returns `csrf_token`, `lang`, `__messages`, `date_format`, `site_name` â€” mirrors HRMS bootstrap pattern
  - **Icon system**: Replaced `ionicons` with `FeatherIcon` from frappe-ui throughout all views
  - **Translations**: `_()` replaced with `__()` injected via `$translate` provider; falls back to identity function if not provided

### 2026-04-04 (continued)
- **Mobile frontend â€” Date picker + Frappe date format**:
  - `southwest/api.py` â€” Added `get_date_format()` whitelist: returns personal date format from User record, falls back to system default (`System Settings`); Frappe notation: `dd`, `mm`, `yyyy`
  - `frontend/src/services/api.ts` â€” Added `getDateFormat()` calling `southwest.api.get_date_format`
  - New `frontend/src/utils/date.ts` â€” `setDateFormat(format)` stores format at boot; `formatDate(isoDate, override?)` converts ISO `YYYY-MM-DD` to user's locale format
  - `frontend/src/main.ts` â€” Bootstrap loads `initSession()`, `loadTranslations()`, `getDateFormat()` concurrently via `Promise.allSettled`; applies format via `setDateFormat` if resolved
  - `CreateSWOPage.vue` â€” Replaced `<ion-input type="date">` with `IonDatetimeButton` + `IonModal` + `IonDatetime` (presentation: date, show-default-buttons); formatted date shown alongside the picker button
  - `SWOPage.vue`, `SWODetailPage.vue`, `SignaturePage.vue` â€” Removed local `formatDate` implementations; now import shared `formatDate` from `@/utils/date`
- **Mobile frontend â€” Signature flow via Ionic frontend**:
  - `generate_signature_link(doc_name, frontend_base_url)` updated to build URL as `{frontend_base_url}/signature?token={token}` instead of static assets path; `frontend_base_url` passed by mobile app as `window.location.origin`
  - New public route `/signature` (no auth) in router pointing to `SignaturePage.vue`
  - New `SignaturePage.vue`: reads `?token` from query params; fetches page data + guest CSRF token concurrently; renders company header, WO summary, equipment, documentation, parts; HTML Canvas signature pad with pointer events (mouse + touch); Clear + Submit buttons; success/expired/already-signed states
  - `SWODetailPage.vue` â€” Staged status shows: "Generate Signature Link" (if no link), or "Open Link" + "Copy Link" + "Regenerate Link" (if link exists); link stored on SWO is reloaded after generation
  - `api.ts` â€” Added: `generateSignatureLink(docName)`, `getSignaturePageData(token)`, `getGuestCsrfToken()`, `submitSignature(token, signature, csrfToken)`, interfaces `SignaturePageData`, `SignatureEquipmentRow`, `SignatureItem`; `ServiceWorkOrderDetail` extended with `signature_token`, `signature_link`
- **Mobile frontend â€” SWO Detail: Service Items + Documentation sections**: When status is Repairing or Partial Repair, the detail view now shows (1) Parts/Items card with add/delete capability â€” modal with non-inventory toggle, item code search (debounced, 300ms), part number, description, qty, vendor; (2) Documentation card with `problem_with_lift` and `repair_description` text areas; "Save Items & Notes" button persists both via `updateSWO()`; sections are read-only when Staged/Completed/Invoiced; Time Log section intentionally excluded from mobile
- **`api.ts`** â€” Added: `SWOItem` interface, `ServiceWorkOrderDetail` extended with `service_items`/`problem_with_lift`/`repair_description`, `updateSWO(name, data)` generic PUT, `searchItems(query)` for inventory item lookup, `ItemResult` interface
- **Mobile frontend â€” i18n applied to all views**: `_()` wrapper from `src/utils/i18n.ts` added to `LoginPage.vue`, `SWOPage.vue`, and `CreateSWOPage.vue`; all user-facing strings go through `_()` so Frappe translations apply automatically
- **Mobile frontend â€” SWO Detail view** (`frontend/src/views/SWODetailPage.vue`):
  - Loads full SWO document via `getSWO(name)` (new `api.ts` function using `/resource/Service Work Order/:name`)
  - Displays: status badge, customer, service type, date, hour meter, PO number, service cost, equipment list
  - Action buttons by status: New/Programmed â†’ Release; Released â†’ Start Repair; Repairing â†’ Mark Partial + Finish Repair; Partial Repair â†’ Resume + Finish Repair; Staged/Completed/Invoiced â†’ locked notice
  - Finish Repair for Labor Rate/Misc shows an `alertController` dialog to capture `hours_worked` before moving to Staged; PM Frequency moves directly
  - Status transitions call `updateSWOStatus(name, status, extra)` (new `api.ts` function using `PUT /resource/Service Work Order/:name`)
- **New route `/swo/:name`** (name: `SWODetail`) added to router; SWO list cards navigate to detail on tap
- **`southwest/api.py`** â€” Added `get_csrf_token()` and `get_app_translations()` whitelists
- **CSRF handling**: axios interceptor adds `X-Frappe-CSRF-Token` header on all mutating requests; `initSession()` fetches and caches token after login and on app boot
- **i18n bootstrap**: `loadTranslations()` now calls `southwest.api.get_app_translations` whitelist (delegates to `frappe.translate.get_all_translations` server-side) instead of calling Frappe translate directly from the client

### 2026-04-04 (continued)
- **New: `southwest/api.py`** â€” App-level whitelist module with two endpoints:
  - `get_technician_swos()`: returns Service Work Orders filtered by `owner = frappe.session.user` (server-side enforcement, used by mobile frontend list)
  - `get_customer_equipment(customer, scheduled_date)`: returns Equipment records with an active Service Equipment Assignment for the customer on the given date; used by the mobile create form to populate the equipment selector
- **Mobile frontend â€” SWO list filtered by owner**: `getSWOs()` in `api.ts` now calls `southwest.api.get_technician_swos` whitelist instead of the generic REST resource endpoint, ensuring each technician sees only their own work orders
- **Mobile frontend â€” Create SWO flow**:
  - New view `frontend/src/views/CreateSWOPage.vue`: form with Customer, Scheduled Date, Service Type, Equipment (filtered by customer + date via `get_customer_equipment`), Hour Meter, PO Number; validates required fields before submit; POSTs to `/resource/Service Work Order`; navigates back to list on success
  - New route `/swo/new` (name: `CreateSWO`) added to `frontend/src/router/index.ts` (requiresAuth)
  - FAB button (bottom-right, `addOutline` icon) added to `SWOPage.vue` to navigate to `/swo/new`
- **`frontend/src/services/api.ts`** â€” Added: `getSWOs` updated to call whitelist; new functions `createSWO(payload)`, `getCustomers()`, `getCustomerEquipment(customer, date)`, `getCompanies()`; new interfaces `Customer`, `Equipment`, `Company`, `NewSWOPayload`

### 2026-04-04
- **New: Ionic Vue 3 mobile frontend** (`frontend/`) for field technicians â€” decoupled from Frappe, communicates via REST API only
- **Initialization**: `npm install -g @ionic/cli --prefix ~/.local` + `ionic start frontend blank --type=vue --no-git` + `npm install axios`
- **`frontend/vite.config.ts`**: Added `server.proxy` block â€” `/api` â†’ `http://localhost:8000` so `ionic serve` (port 8100) works without CORS issues in development
- **`frontend/src/services/api.ts`**: axios instance (`baseURL: '/api'`, `withCredentials: true`); functions: `login(usr, pwd)`, `getLoggedUser()` (returns `"Guest"` when unauthenticated), `logout()`, `getSWOs()` (fields: name, work_order_number, status, customer, scheduled_date, service_type)
- **`frontend/src/router/index.ts`**: routes `/login` â†’ LoginPage, `/swo` â†’ SWOPage (requiresAuth); `beforeEach` guard calls `getLoggedUser()` â€” redirects Guest to `/login`, logged-in user away from `/login` to `/swo`
- **`frontend/src/views/LoginPage.vue`**: `<script setup lang="ts">`; refs `usr`, `pwd`, `loading`, `errorMsg`; Ionic components `IonInput`, `IonButton`, `IonSpinner`; on success â†’ `router.replace('/swo')`
- **`frontend/src/views/SWOPage.vue`**: `onMounted` â†’ `getSWOs()`; `ion-refresher` for pull-to-refresh; `ion-card` per order with status badge (color mapped via `statusColor()`), customer, date; logout button calls `logout()` + `router.replace('/login')`
- **`site_config.json`**: Added `"allow_cors": "http://localhost:8100"` and `"ignore_csrf_for_cors": 1` â€” required for Capacitor native builds or accessing Frappe directly; `bench restart` needed after this change
- **`.gitignore`**: Added `frontend/node_modules/`, `frontend/dist/`, `frontend/.ionic/`, `frontend/cypress/` artifacts
- **Dev command**: `cd frontend && ionic serve` â†’ opens at http://localhost:8100

### 2026-03-30
- App initialized with `bench new-app southwest`
- Service Management module configured
- Added custom fields to **Item**: `custom_southwest_section`, `custom_customer`, `custom_component`, `custom_part_color`
- Added custom field to **Customer**: `custom_customer_code` (Data, reqd)
- Created `public/js/overrides/item.js`: auto-generates `item_code` as `{customer_code}-{component}/{item_name}-{part_color}`
- Created `setup.py` as install orchestrator (`after_install` / `before_uninstall`)
- Created `startup/custom_fields.py` and `startup/property_setters.py`
- Created `overrides/` and `public/js/overrides/` directories
- Configured hooks in `hooks.py`
- Added `.vscode/settings.json` with Python interpreter and extraPaths

### 2026-03-31
- Created DocType **Make** (`autoname: field:make_name`, single field: `make_name` Data reqd unique)
- Created DocType **Equipment** (initially named Customer Equipment, immediately renamed):
  - Custom `autoname()` hook builds name as `{customer_code}-{make}/{model}/{serial_no}`
  - Fields: `customer`, `make` (Linkâ†’Make), `equipment_class`, `customer_unit_id_number` (reqd, search_field), `series`, `model`, `serial_no`
  - Renamed from **Customer Equipment** to **Equipment** via `frappe.rename_doc`; directory renamed to `doctype/equipment/`; files renamed to `equipment.json` / `equipment.py` / `equipment.js`; all internal references updated
- Created child DocType **Service Work Order Item** (`vendor` as plain Data, not Supplier link)
- Created child DocType **Service Work Order Time Log**
- Created **Service Work Order** (non-submittable, `autoname: WO-.YY.-.#######`):
  - Status flow: New â†’ Released â†’ Repairing â‡„ Partial Repair â†’ Staged â†’ Completed â†’ Invoiced / Cancelled
  - Status shown as colored badge via `frm.page.set_indicator()`
  - Status-based form locking via `frm.disable_form()` and `set_df_property("read_only")`
  - Action buttons per status: Release, Start Repair, Partial Repair, Finish Repair, Complete Work Order, Create Invoice
  - "Complete Work Order" â†’ Signature pad dialog â†’ Python `complete_work_order()` bypasses disabled form
  - After completing PM Frequency/Misc â†’ prompt Next Scheduled Date â†’ `create_programmed_order()`
- Created `service_work_order_list.js` â€” list view shows `status` as colored indicator
- Created Script Report **Service Work Orders** â€” filters: from/to date, status, customer, service type
- Created Print Format **Service Work Order** â€” HTML Jinja template; sections: company header, order/equipment cards, service items, documentation, customer signature
- Applied Property Setter: `Employee.show_title_field_in_link = 1`
- Created `public/js/utils/company.js` with `southwest.utils.set_default_company(frm)` â€” auto-sets default company, hides field when only one company exists
- Created `public/js/southwest.bundle.js` â€” single entry point for all app-wide JS utilities; registered in `hooks.py` via `app_include_js`

### 2026-04-01
- Created DocType **Sequence** (`naming_rule: Set by user`) â€” generic named counter with `current` (Int) and `padding` (Int) fields
- Created `utils/sequence.py` with `get_next_sequence(initial_current, padding, *args)`:
  - Key = `frappe.scrub(join(args)) + "_id_seq"` (e.g. `service_work_order_id_seq`)
  - Uses `SELECT â€¦ FOR UPDATE` to lock row and prevent race conditions
  - Creates the Sequence record on first use; increments `current` by 1; returns zero-padded string
- Added custom field `custom_company_sequence` (Data, read_only, no_copy) to **Sales Invoice**
- Registered `doc_events` in `hooks.py`: Sales Invoice `before_insert` â†’ assigns `custom_company_sequence`
- Created `overrides/sales_invoice_events.py`
- **Equipment**: Removed all pricing/cost fields (`labor_rate_cost`, `frequency_pm_cost`, `misc_cost`). Equipment now holds physical hardware data only
- Created child DocType **Service Work Order Equipment** â€” single field `equipment` (Linkâ†’Equipment, reqd); used as Table MultiSelect in SWO
- **Service Work Order**:
  - Replaced single `equipment` Link field with `equipment_selection` (Table MultiSelect â†’ Service Work Order Equipment)
  - `service_type` options: `PM Frequency / Misc / Labor Rate`; PM Frequency and Labor Rate limited to 1 equipment row
  - Added `hours_worked` (Float, hidden/read_only â€” captured in Finish Repair dialog for Labor Rate/Misc)
  - Added `company` (Linkâ†’Company, reqd); `set_default_company(frm)` auto-sets and hides when single company
  - Added `work_order_number` (Data, hidden, read_only) â€” 6-digit sequence assigned in `before_insert`
  - Removed `service_contract`, `responsible` fields
  - Added server-side `_calculate_service_cost()` in `validate()`: PMâ†’`pm_price_per_visit`; Labor Rateâ†’`hours_worked Ã— labor_rate`; Miscâ†’`hours_worked Ã— misc_rate`
  - Added `get_valid_equipment_for_customer()` whitelist â€” filters equipment by customer + active assignment on scheduled_date; NULL-safe `valid_to` handling
  - Added `update_customer_po_number()` whitelist â€” "Update PO Number" action button visible from Repairing through Completed
- **SWO Item**: Removed `cost_price` and `sale_price`; added `part_number` (auto-filled from `custom_component` on item_code select)
- Created child DocType **Service Contract Equipment** â€” `equipment`, `pm_frequency`, `pm_price_per_visit`, `equipment_labor_rate`
- Created submittable DocType **Service Contract** (`SC-.YY.-#####`):
  - `before_insert`: assigns `contract_number` (6-digit sequence)
  - General rates: `labor_rate`, `misc_rate` (reqd); validity dates; covered equipment child table
  - `on_submit`: creates one Service Equipment Assignment per equipment row
  - `on_cancel`: sets all linked assignments to `status = Inactive`
  - JS: filters `equipment_details` by selected customer; customer change clears child table
- Created DocType **Service Equipment Assignment** (`SA-.YY.-#####`, non-submittable):
  - All data fields read_only â€” populated exclusively by Service Contract submission
  - `status` (Active/Inactive) is the only user-editable field
  - JS: `frm.disable_save()` hides the Save button
- Created DocType **Service Manager Settings** (Single, `issingle: 1`):
  - Fields: `pm_labor_item`, `labor_rate_item`, `misc_labor_item` (all Linkâ†’Item)
  - JS: `set_query` on all three fields filters to `is_stock_item = 0`
- **Invoicing flow**: SWO no longer stores a `sales_invoice` reference. Sales Invoice stores `custom_source_doctype` / `custom_source_document` (Dynamic Link). Sales Invoice `on_submit` sets linked SWO to Invoiced. "Create Invoice" navigates to draft via `frappe.set_route`
- `resolve_and_create_invoice()` appends a labor line from Service Manager Settings (item by service_type). For Labor Rate/Misc: `qty = hours_worked`, `rate = service_cost / hours_worked`. For PM Frequency: `qty = 1`, `rate = service_cost`
- Workspace Sidebar (`service_management.json`): added "Settings" section + Service Manager Settings link
- Fixed `app_include_js` path to `"southwest.bundle.js"` (Frappe v16 bundle resolution)
- `set_query` for Table MultiSelect corrected to `frm.set_query("fieldname", callback)` â€” not child-table form variant

### 2026-04-02 (continued)
- **Signature flow â€” replaced Jinja portal page with static SPA**: `public/signature/index.html` served at `/assets/southwest/signature/?token=...`. No Frappe routing dependency. JS reads `?token` from URL, calls `get_signature_page_data(token)` whitelist (JSON), renders full work order layout, and submits signature via `submit_signature`. Works on tablet and mobile without login.
- **New whitelist `get_signature_page_data(token)`** (`allow_guest=True`): returns company info, customer, equipment rows, service items, documentation fields as JSON. Returns `{expired: true}` if token not found, `{already_signed: true}` if status != Staged.
- **`generate_signature_link`**: updated URL to `/assets/southwest/signature/?token=...`
- **`bench build --app southwest`** run to copy `public/signature/index.html` to `sites/assets/southwest/signature/`

### 2026-04-02 (continued)
- **Print Format â€” monochromatic letterhead**: Replaced all color references (`#1a56a0` blue) with black/gray tones. Added company letterhead block: logo (`company_doc.company_logo`, grayscale filtered), company name (uppercase bold), address/phone/email. Layout now matches reference PDF: Repair Order # title, info grid, equipment row (Make/Model/Serial/Unit), documentation two-column, Parts table (Description + Quantity), Signature + Date lines at bottom, footer with contact info and page number.
- **Signature web page â€” full work order display**: Expanded Python context (`swo-signature.py`) to include customer address (via Dynamic Link), equipment details (make, model, serial_no, customer_unit_id_number), service_items list, documentation fields, company logo/phone/email. Updated `swo-signature.html` to render the complete order layout (letterhead, info grid, equipment, problem/description, parts table) above the signature canvas.

### 2026-04-02 (continued)
- **SWO â€” time log duration auto-calculated**: Removed "Duration (hours)" field from Partial Repair and Finish Repair dialogs. `close_last_time_log()` now computes duration as `(Date.now() - start_time) / 3600000`. Total repair time recalculated inline to avoid async race with `frappe.model.set_value`.
- **SWO â€” Hours Worked visibility**: Removed `hidden: 1` from `hours_worked` field; added `depends_on: eval:doc.hours_worked > 0` so it appears on the form only when a value is set (Labor Rate / Misc orders after finishing repair).

### 2026-04-02 (continued)
- **New DocType Service Part Assignment**: created automatically when SWO completes (via `complete_work_order` whitelist and `submit_signature`) for each `is_non_inventory_part = 1` row. Fields: `service_work_order`, `swo_row_name` (hidden), `part_number`, `description`, `qty`, `item_code`, `status` (Pending/Assigned). Validate hook auto-sets status to Assigned when `item_code` is filled.
- **Invoicing flow redesign â€” `resolve_and_create_invoice`**: removed `assignments` parameter (no longer needs a JS dialog). New logic:
  1. Guard: throws if a non-cancelled Sales Invoice already exists for this SWO (`custom_source_document` match, `docstatus < 2`)
  2. Guard: throws listing pending Part Assignments that still need an Item assigned
  3. Splits items by `custom_service_includes_item` on the Item master:
     - `= 1` â†’ Stock Entry (Material Issue) â€” exits inventory, no invoice line
     - `= 0` â†’ Sales Invoice line with selling price from Item Price
  4. Part Assignments (Assigned) processed by same split logic
  5. Labor line from Service Manager Settings appended as before
- **JS**: "Create Invoice" button simplified â€” no more item-resolution dialog; calls `resolve_and_create_invoice(doc_name)` directly
- **Property Setters**: `custom_source_doctype` and `custom_source_document` on Sales Invoice set to `hidden = 1` via `startup/property_setters.py`
- **Item custom field**: `custom_service_includes_item` (Check, insert_after: is_stock_item) â€” controls whether a part exits inventory silently (service-included) or gets billed to customer

### 2026-04-02 (continued)
- **SWO â€” signature link flow**: Replaced "Complete Work Order" button (Staged status) with a two-step public signature flow
  - New fields on Service Work Order: `signature_token` (Data, hidden) and `signature_link` (Data, hidden)
  - **Staged + no link**: button "Generate Signature Link" â†’ calls `generate_signature_link()` whitelist â†’ stores SHA-256 token and full URL on doc â†’ reloads form â†’ opens link in new tab
  - **Staged + link exists**: buttons "Open Link" (opens tab) and "Copy Link" (`frappe.utils.copy_to_clipboard`)
  - New whitelist `generate_signature_link(doc_name)`: generates 64-char hex token via `os.urandom`, builds URL `{base_url}/swo-signature?token={token}`, saves to doc, returns URL
  - New whitelist `submit_signature(token, signature)` (`allow_guest=True`): validates token, sets `customer_signature`, advances status to Completed, clears token+link atomically
  - New web page `www/swo-signature.py` + `www/swo-signature.html`: public, no login required; shows order details (customer, service type, date, equipment); canvas signature pad with mouse+touch support; POST to `submit_signature`; shows "already signed" state if token is gone; raises `DoesNotExistError` (404) for invalid tokens

### 2026-04-02 (continued)
- **New Page: Service Manager Dashboard** (`service-manager-dashboard`)
  - Location: `southwest/service_management/page/service_manager_dashboard/`
  - **`get_dashboard_data()`** whitelist (`service_manager_dashboard.py`): single server call returns three KPI counts (`pending_assignments`, `waiting_signature`, `ready_to_invoice`) and the 10 most recent pending `Service Part Assignment` rows (fields: name, service_work_order, part_number, description, qty)
  - **JS** (`service_manager_dashboard.js`): full pure-JS architecture â€” no `frappe.render_template`, no HTML template file. `inject_smd_styles()` injects a `<style>` tag once using Frappe CSS variables (light/dark safe). `build_smd_html()` appends the skeleton DOM to `page.body`. `render_smd_kpis()` builds native `.widget.number-widget-box` cards. `render_smd_table()` builds a native `.frappe-list` / `.list-row-container` structure. `on_page_load` + `on_page_show` refresh data on every navigation. "Refresh" inner button.
  - **`.html` file**: empty â€” kept only as a placeholder so Frappe does not error on missing file
  - Workspace sidebar: "Dashboard" link added as first item (link_type: Page â†’ `service-manager-dashboard`)
  - Requires `bench build --app southwest` after changes to compile the HTML template into `frappe.templates`

### 2026-04-02 (continued)
- **SWO â€” `signature_date` field**: New `Datetime` field (no_copy, read_only, visible only when Completed/Invoiced). Set automatically in `submit_signature` and `complete_work_order` via `frappe.utils.now_datetime()`. Cleared on `create_programmed_order`. Print format Date box shows the stored value when present, blank line otherwise. Existing signed records back-filled with `NOW()` via direct SQL update.

### 2026-04-02 (continued)
- **Invoicing â€” labor line qty/rate**: For `Labor Rate` and `Misc` service types, invoice labor line now uses `qty = hours_worked` and `rate = service_cost / hours_worked` (hourly rate). For `PM Frequency`: `qty = 1`, `rate = service_cost` (flat fee). Fixes prior behavior where hours were multiplied into a single amount.

### 2026-04-02
- **Item custom fields**: Removed `reqd: 1` from `custom_customer`, `custom_component`, `custom_part_color` in `custom_fields.py` and updated DB directly (`tabCustom Field` SET reqd=0). Required-field enforcement moved to server-side `overrides/item_events.py` â€” only validates when `is_stock_item = 1`
- **Item JS**: Added `refresh` and `is_stock_item` event handlers â€” hides/shows Southwest section and fields based on `is_stock_item`; `generate_item_code()` only runs when `is_stock_item` is true
- **Item custom field**: Added `custom_service_includes_item` (Check, insert_after: is_stock_item)
- **Service Manager Settings JS**: Created `service_manager_settings.js` â€” labor item fields filtered to `is_stock_item = 0`
- **doc_events**: Registered Item `validate` â†’ `southwest.overrides.item_events.validate`
- **DEVELOPMENT.md**: Cleaned up all stale references to `customer_equipment.json` / `customer_equipment.py`; corrected Project Structure, Custom Doctypes table, and Changelog to reflect current state

### 2026-04-05 (Fixes & Stability)
- **Frontend Dev Server**: Added `watch: { usePolling: true }` to `vite.config.ts` to fix event-propagation failures on Docker/Windows filesystem, restoring Vite Hot Module Reloading.
- **Frontend HMR & Proxy**: Disabled `frappeProxy` in `vite.config.ts` to resolve Vue application loop bootstrapping issues; explicitly configured proxy to route `/api` to `http://localhost:8000`.
- **Frontend Boot**: Refactored component bootstrap and API fetching to fix `CSRFTokenError` during development initialization payload fetch.
- **Frontend Navigation Fallbacks**: Updated Vue Router guards in `index.ts` to automatically redirect authenticated users navigating to `/login` to `/home` instead of `/swo`.
- **SWO List Dashboard API**: Updated `southwest/api.py` whitelist `get_technician_swos` to specifically exclude `["!=", "Invoiced"]` statuses.
- **Create SWO UI**: Fixed `Equipment` ID being dropped during API submission in `CreateSWOPage.vue` and styled form.
- **SWO Detail UI Refactor**: Refactored action buttons (Save, Pause, Finish, and Signature links) from main page content into a fixed `<ion-footer>` configured as a unified, proportional segmented button bar. Modified the primary Save button to high-contrast black/white. Removed "Service Cost" visibility.
- **Service Part Assignment Naming**: Modified `service_part_assignment.json` autonaming rule to Expression-based formatting: `SPA-.YY.-.#####`.
- **Service Manager Dashboard**: Replaced the "Assign Item" redirect with an inline modal `frappe.ui.Dialog` popup. Backend updated to retrieve `scheduled_date` from related SWOs.
- **PWA Installation**: Built native `HomePage.vue` landing screen with PWA application installation logic. Intercepts `beforeinstallprompt` globally in `pwa.ts` and displays a native app install prompt directly from the Home menu like HRMS.
- **Item Customizations (HRMS)**: Refined `custom_southwest_section` in `custom_fields.py` to use an empty label rather than "Southwest", creating seamless visual integration into standard pages.




## Notes

- Customizations to ERPNext/HRMS doctypes are done via **Custom Fields** and **Property Setters** through `startup/custom_fields.py`, not by modifying the source code of base apps.
- To add JS to existing doctypes use `doctype_js` in `hooks.py` pointing to `public/js/overrides/`.
- To override a Python controller use `override_doctype_class` in `hooks.py` pointing to `overrides/`.
- `setup.py` is the orchestrator â€” each concern lives in its own file under `startup/`.
- Technicians only fill part info on SWO (part_number, description, qty, vendor). Item assignment is handled by the billing area at invoice time.
- `utils/sequence.py` uses `FOR UPDATE` SQL to lock the Sequence row before incrementing, preventing duplicates under concurrent inserts.
- The `Sequence` DocType name (primary key) is the dynamically generated snake_case key â€” never auto-named by Frappe.
- Equipment was originally created as "Customer Equipment" and immediately renamed to "Equipment". The only reference to the original name should be this historical note.

### 2026-04-05 (Item Owner Type + Frontend Session Migration)

**Item — custom_fields.py**
- Added `custom_generate_code_btn` (Button, insert_after: `item_code`) — triggers manual code generation
- Added `custom_owner_type` (Select: `\nCustomer\nCompany`, insert_after: section break) — determines which doctype the owner link resolves to
- Changed `custom_customer` from `Link → Customer` to `Dynamic Link` using `custom_owner_type` as options field; label renamed from "Customer" to "Owner"
- `custom_component` and `custom_part_color` explicitly set `reqd: 0`

**Item — overrides/item_events.py**
- Validation rewritten: requires `custom_owner_type` (must be Customer or Company) and `custom_customer` (Owner) when `is_stock_item = 1`
- Removed mandatory check for `custom_component` and `custom_part_color` — now always optional

**Item — public/js/overrides/item.js**
- Removed auto-generation on field change; generation now triggered only by "Generate Code" button click (`custom_generate_code_btn` event)
- Added `custom_owner_type` change handler: clears `custom_customer`, hides owner field until type is selected
- `toggle_southwest_fields()`: only `custom_owner_type` and `custom_customer` get `reqd = 1` when `is_stock_item`; component and part_color always `reqd = 0`
- `generate_item_code()`: if Customer → fetches `custom_customer_code` from Customer; if Company → fetches `abbr` from Company
- `apply_item_code()`: builds code as `{owner_code}-{component}/{item_name}-{color}`, skipping empty optional parts

**Frontend — Session pattern (HRMS-style)**
- New `src/data/session.ts`: reactive session object; `isLoggedIn` reads `user_id` cookie synchronously; `login()` calls `call('login')` + `handleLogin()`; `logout()` calls `call('logout')` + reloads; `otp()` support added
- `src/router/index.ts`: guard is now synchronous — reads `session.isLoggedIn` directly, no API roundtrip per navigation; logged-in users redirected to `Home` (not `SWO`)
- `src/main.ts`: imports and provides `$session`; calls `initPWA()` at bootstrap start
- `src/views/SWOPage.vue`: replaced manual fetch with `createResource({ url: 'southwest.api.get_technician_swos', method: 'GET', auto: true })`; injects `$session` for logout
- `src/views/LoginPage.vue`: injects `$session`; calls `session.login()` instead of direct API import

**Project documentation**
- `.cursorrules` created at repo root with Docker environment rule and 3 architecture rules
- Memory file `project_rules.md` saved to persistent Claude memory

### 2026-04-05 (Item event removed)
- **hooks.py `doc_events`**: Removed `Item.validate → southwest.overrides.item_events.validate` — server-side field validation for Item is no longer active; all validation is now handled client-side in `public/js/overrides/item.js`
- **overrides/item_events.py**: Cleared — kept as a placeholder with a note; no logic runs from this file

### 2026-04-05 (Billing & Inventory refactoring)

**New child DocType — Customer Item Exception** (`southwest/service_management/doctype/customer_item_exception/`)
- Fields: `item_code` (Link→Item, reqd), `item_name` (Data, fetch_from, read_only), `pm_frequency` (Check), `misc` (Check), `labor_rate` (Check)
- `istable: 1` — used as a child table inside Customer
- Replaces the old `custom_service_includes_item` global check on Item master; exceptions are now per-customer per-service-type

**custom_fields.py**
- **Removed**: `custom_service_includes_item` (Check) from Item — obsolete global flag
- **Customer**: Added `custom_service_exceptions_tab` (Tab Break, insert_after: `custom_customer_code`) and `custom_service_item_exceptions` (Table → Customer Item Exception) — new "Service Exceptions" tab on the Customer form
- **Sales Invoice**: Added `custom_work_order_number` (Data, read_only, no_copy, print_hide, insert_after: `custom_source_document`) — stores the SWO's human-readable work order number for reference
- **Stock Entry** (new): Added `custom_source_doctype` (Data, hidden), `custom_source_document` (Data, hidden), `custom_work_order_number` (Data, read_only) — mirrors the Sales Invoice tracking fields; set by `create_stock_entry` server function

**Equipment.json**
- Removed `equipment_number` field entirely (from `field_order`, `fields` array, and `title_field`)
- `title_field` changed to `customer_unit_id_number`

**Service Manager Settings**
- `service_manager_settings.json`: Added new section "Inventory" with field `default_swo_stock_entry_type` (Link→Stock Entry Type) — specifies entry type for SWO write-offs (typically Material Issue)
- `service_manager_settings.js`: Added `set_query` for `default_swo_stock_entry_type` filtering to `purpose = "Material Issue"`

**service_work_order.py**
- Added helper `_get_exception_item_codes(customer, service_type)`: queries `Customer Item Exception` child table filtered by customer + the flag matching the service type (pm_frequency / misc / labor_rate); returns a set of item codes
- **New whitelist `create_stock_entry(doc_name)`**: creates a draft Stock Entry for items in the SWO that match the customer's exception table; entry type from Service Manager Settings (`default_swo_stock_entry_type`); sets `custom_source_doctype`, `custom_source_document`, `custom_work_order_number`; throws if duplicate or no matching items
- **`resolve_and_create_invoice` refactored**:
  - Removed inline Stock Entry creation
  - Replaced `custom_service_includes_item` Item-level check with `_get_exception_item_codes()` call
  - Exception items are silently excluded from the invoice (handled separately via Create Stock Entry)
  - Sales Invoice now also receives `custom_work_order_number`

**service_work_order.js**
- Added "Create Stock Entry" button in `Actions` group — visible at Staged and Completed status; shows confirmation dialog before calling `create_stock_entry` whitelist; on success shows alert with link to the new Stock Entry
- New `create_stock_entry(frm)` function added at bottom of file

**New: public/js/overrides/sales_invoice.js**
- On `refresh`: if `custom_source_doctype === "Service Work Order"`, sets `update_stock = 1` and makes the field read-only — prevents users from unchecking stock posting on SWO-sourced invoices

**New: public/js/overrides/stock_entry.js**
- On `refresh`: if `custom_source_doctype === "Service Work Order"`, makes `stock_entry_type` read-only; if not yet set, fetches `default_swo_stock_entry_type` from Service Manager Settings and applies it

**hooks.py**
- Added `"Sales Invoice": "public/js/overrides/sales_invoice.js"` to `doctype_js`
- Added `"Stock Entry": "public/js/overrides/stock_entry.js"` to `doctype_js`

### 2026-04-06 (CI/CD — Translation Hub Sync)

**New: `.github/workflows/push_translations_to_hub.yml`**
- GitHub Actions workflow that syncs `southwest/locale/main.pot` to the central `frappe-translations-hub` repository
- **Triggers**:
  - `workflow_dispatch` — manual run from the Actions tab
  - `push` to `main` branch when `southwest/locale/main.pot` changes
- **Steps**:
  - A: Checkout `southwest` app repo
  - B: Checkout `frappe-translations-hub` using `secrets.TRANSLATIONS_HUB_PAT` (write-enabled PAT stored as a GitHub secret)
  - C: Create `southwest/locale/` directory in the hub if it does not exist
  - D: Copy `southwest/locale/main.pot` into `frappe-translations-hub/southwest/locale/main.pot`
  - E: Configure git bot identity, commit with message `chore(southwest): sync main.pot from southwest@<sha>`, and push; skips commit when file is identical
- **Security**: hub credentials are never hardcoded — only `secrets.TRANSLATIONS_HUB_PAT` is used; the bot identity uses the standard `github-actions[bot]` address

**Required setup** (one-time, outside this repo):
1. Create a GitHub Personal Access Token (classic or fine-grained) with `Contents: write` on `frappe-translations-hub`
2. Add it as a repository secret named `TRANSLATIONS_HUB_PAT` in the `southwest` repo settings

### 2026-04-10 (Frontend — Serve Vue app via Frappe www)

**frontend/vite.config.ts**
- Configured `frappeui` plugin with `buildConfig`: `outDir` → `../southwest/public/frontend`, `baseUrl` → `/assets/southwest/frontend/`, `indexHtmlPath` → `../southwest/www/southwest.html`
- Removed manual `base` and `build` fields (now handled by the `frappeui` `buildConfig` sub-plugin)

**frontend/src/router/index.ts**
- Router `createWebHistory` base now uses `/southwest/` in production and `/` in dev, so sub-routes resolve correctly when served from Frappe

**southwest/www/southwest.html** *(auto-generated by `vite build`)*
- Created by `frappeui` `buildConfig` plugin on each build; references hashed asset URLs and injects Frappe boot data via Jinja

**southwest/www/southwest.py**
- `no_cache = 1` — disables HTTP caching for the SPA entry point

**southwest/hooks.py**
- Enabled `add_to_apps_screen` pointing to `/southwest` (no `has_permission` guard — all authenticated users can access)
- Added `website_route_rules`: `/southwest/<path:app_path>` → `southwest`, so refreshing or deep-linking any SPA sub-route serves the same entry point

Last Change: 2026-04-10



