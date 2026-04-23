import frappe
from southwest.service_management.doctype.service_work_order.service_work_order import generate_signature_link


@frappe.whitelist()
def get_technician_swos(hours_limit=None):
	"""
	Return Service Work Orders where the current session user is the responsible_user.
	Used by the mobile frontend to show only the technician's own assigned work orders.
	Supports optional hours_limit for recent activity filtering.
	"""
	import frappe
	from frappe.utils import add_to_date, now_datetime, time_diff_in_seconds

	filters = {"status": ["not in", ["Billed", "Issued", "Closed", "Cancelled"]]}
	if frappe.session.user != "Administrator":
		filters["responsible_user"] = frappe.session.user

	if hours_limit:
		since = add_to_date(now_datetime(), hours=-int(hours_limit))
		filters["modified"] = [">=", since]

	swos = frappe.get_list(
		"Service Work Order",
		filters=filters,
		fields=[
			"name",
			"work_order_number",
			"status",
			"customer",
			"scheduled_date",
			"service_type",
			"responsible_user",
			"modified",
		],
		order_by="modified desc",
		limit=50,
	)

	now = now_datetime()
	for swo in swos:
		# diff_seconds is positive if now > swo.modified
		diff_seconds = time_diff_in_seconds(now, swo.modified)
		swo["time_ago_minutes"] = int(max(0, diff_seconds / 60))

	return swos


@frappe.whitelist()
def get_customer_equipment(customer, scheduled_date=None):
	"""
	Return Equipment records for a customer that have an active
	Service Equipment Assignment on the given date.
	Used by the mobile frontend to populate the equipment selector.
	"""
	ref_date = scheduled_date or frappe.utils.today()

	return frappe.db.sql(
		"""
		SELECT DISTINCT
			e.name,
			e.customer_unit_id_number,
			e.make,
			e.model,
			e.serial_no
		FROM `tabEquipment` e
		INNER JOIN `tabService Equipment Assignment` a
			ON  a.equipment  = e.name
			AND a.customer   = %(customer)s
			AND a.status     = 'Active'
			AND a.valid_from <= %(ref_date)s
			AND (a.valid_to IS NULL OR a.valid_to >= %(ref_date)s)
		WHERE e.customer = %(customer)s
		ORDER BY e.customer_unit_id_number
		""",
		{"customer": customer, "ref_date": ref_date},
		as_dict=True,
	)


@frappe.whitelist()
def get_default_company():
	"""Return the default company name configured in Frappe global defaults."""
	return frappe.db.get_default("company") or ""


@frappe.whitelist()
def get_csrf_token():
	"""Return the CSRF token for the current authenticated session."""
	return frappe.local.session.data.csrf_token


@frappe.whitelist(allow_guest=True)
def get_date_format():
	"""
	Return the date format for the current system.
	Format uses Frappe notation: dd, mm, yyyy (e.g. 'dd-mm-yyyy').
	"""
	return frappe.db.get_default("date_format") or "dd-mm-yyyy"


@frappe.whitelist(allow_guest=True)
def get_context_for_dev():
	"""
	Bootstrap endpoint for the mobile frontend in development mode.
	Returns frappe.boot data (csrf_token, date_format, lang, translations)
	so the SPA can initialize without a server-rendered HTML page context.
	Only works when developer_mode is enabled.
	"""
	if not frappe.conf.developer_mode:
		frappe.throw(frappe._("This method is only available in developer mode."))

	# Get CSRF token safely — session_obj can be None for browser sessions
	# with stale/expired cookies, causing session_obj.update() to raise.
	# Only return a real persisted token; never a client-generated fake.
	csrf_token = ""
	try:
		session_data = getattr(frappe.local, "session", None)
		if session_data and getattr(session_data, "data", None):
			csrf_token = session_data.data.csrf_token or ""
		if not csrf_token and getattr(frappe.local, "session_obj", None):
			# session_obj is available — safe to generate and persist a real token
			csrf_token = frappe.sessions.get_csrf_token()
			frappe.db.commit()
	except Exception:
		pass  # csrf_token stays ""; client will fetch it after login

	lang = frappe.local.lang or "en"
	translations = {}
	if lang != "en":
		from frappe.translate import get_all_translations
		translations = get_all_translations(lang)

	date_format = frappe.db.get_default("date_format") or "dd-mm-yyyy"

	return {
		"csrf_token": csrf_token,
		"lang": lang,
		"__messages": translations,
		"date_format": date_format,
		"site_name": frappe.local.site,
	}


@frappe.whitelist(allow_guest=True)
def get_app_translations():
	"""
	Return the Frappe translation dict for the system language.
	Used by the mobile frontend to load translations at boot time.
	"""
	lang = frappe.local.lang or "en"
	if lang == "en":
		return {}
	from frappe.translate import get_all_translations
	return get_all_translations(lang)


@frappe.whitelist()
def get_attendance_status():
	"""
	Return the attendance status for the current user's linked employee.
	Finds the employee by user_id field and returns the last check-in log type for today.
	"""
	employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
	if not employee:
		return {"employee": None, "last_log_type": None, "checked_in": False}

	today = frappe.utils.today()
	last_log = frappe.db.get_value(
		"Employee Checkin",
		{"employee": employee, "time": [">=", today]},
		["log_type", "time"],
		order_by="time desc",
		as_dict=True,
	)

	return {
		"employee": employee,
		"last_log_type": last_log.log_type if last_log else None,
		"last_log_time": str(last_log.time) if last_log else None,
		"checked_in": last_log.log_type == "IN" if last_log else False,
	}


@frappe.whitelist()
def add_checkin_log(log_type: str, latitude: float = 0, longitude: float = 0):
	"""Create an Employee Checkin log using the server-side timestamp."""
	from hrms.hr.doctype.employee_checkin.employee_checkin import add_log_based_on_employee_field

	add_log_based_on_employee_field(
		employee_field_value=frappe.session.user,
		timestamp=frappe.utils.now_datetime(),
		log_type=log_type,
		employee_fieldname="user_id",
		latitude=latitude,
		longitude=longitude,
	)


@frappe.whitelist()
def get_active_customer_po(customer):
	"""
	Return the most recent active PO Number for a given customer.
	Only considers records where valid_from is today or earlier.
	"""
	if not customer:
		return None

	po_assignment = frappe.db.get_value(
		"Customer PO Assignment",
		{
			"customer": customer,
			"is_active": 1,
			"valid_from": ["<=", frappe.utils.today()]
		},
		"po_number",
		order_by="valid_from desc"
	)

	return po_assignment


@frappe.whitelist()
def regenerate_swo_signature_link(swo_name):
	"""
	Refreshes the signature link and token for a given Service Work Order.
	Returns the new link.
	"""
	if not swo_name:
		frappe.throw("Service Work Order name is required.")
	
	# Status check — only allowed for Staged documents
	status = frappe.db.get_value("Service Work Order", swo_name, "status")
	if status != "Staged":
		frappe.throw(f"Cannot regenerate link for work order in '{status}' status.")

	return generate_signature_link(swo_name)



@frappe.whitelist()
def process_billing_and_stock(swo_name):
	from southwest.service_management.doctype.service_work_order.service_work_order import _get_exception_item_codes
	
	doc = frappe.get_doc("Service Work Order", swo_name)
	
	# Guard: check pending parts
	pending = frappe.db.get_all(
		"Service Part Assignment",
		filters={"service_work_order": swo_name, "status": "Pending"},
		fields=["name", "part_number", "description"],
	)
	if pending:
		names = ", ".join(p.part_number or p.description or p.name for p in pending)
		frappe.throw(f"The following parts still need an Item assigned before processing: {names}")
		
	# Resolve exception items
	exception_codes = _get_exception_item_codes(doc.customer, doc.service_type)
	
	# Collect raw items
	inventory_rows = [
		r for r in (doc.service_items or [])
		if not r.is_non_inventory_part and r.item_code
	]
	part_assignments = frappe.get_all(
		"Service Part Assignment",
		filters={"service_work_order": swo_name, "status": "Assigned"},
		fields=["item_code", "qty", "description", "part_number", "swo_row_name"]
	)
	
	items_to_write_off = []
	invoice_lines = []
	
	def push_item(item_code, qty, desc):
		if item_code in exception_codes:
			items_to_write_off.append({"item_code": item_code, "qty": qty})
		else:
			sale_price = frappe.db.get_value("Item Price", {"item_code": item_code, "selling": 1}, "price_list_rate") or 0
			invoice_lines.append({"item_code": item_code, "qty": qty, "rate": sale_price, "description": desc})
			
	for r in inventory_rows:
		push_item(r.item_code, r.qty or 1, r.description or "")
		
	for pa in part_assignments:
		if pa.item_code:
			push_item(pa.item_code, pa.qty or 1, pa.description or pa.part_number or "")
			
	created = {"stock_entry": None, "sales_invoice": None}
	
	# Create Stock Entry
	if items_to_write_off:
		existing_se = frappe.db.get_value("Stock Entry", {"custom_source_doctype": "Service Work Order", "custom_source_document": swo_name, "docstatus": ["<", 2]}, "name")
		if not existing_se:
			settings = frappe.get_single("Service Manager Settings")
			entry_type = settings.default_swo_stock_entry_type or "Material Issue"
			default_warehouse = frappe.db.get_value("Company", doc.company, "default_inventory_account") or frappe.db.get_default("default_warehouse") or ""
			
			se = frappe.get_doc({
				"doctype": "Stock Entry",
				"stock_entry_type": entry_type,
				"company": doc.company,
				"custom_source_doctype": "Service Work Order",
				"custom_source_document": swo_name,
				"custom_work_order_number": doc.work_order_number or swo_name,
				"items": [{"item_code": i["item_code"], "qty": i["qty"], "s_warehouse": default_warehouse} for i in items_to_write_off]
			})
			se.insert(ignore_permissions=True)
			created["stock_entry"] = se.name
			
	# Process Labor & Invoice lines
	if doc.service_cost:
		settings = frappe.get_single("Service Manager Settings")
		labor_item_map = {
			"PM Frequency": settings.pm_labor_item,
			"Labor Rate": settings.labor_rate_item,
			"Misc": settings.misc_labor_item,
		}
		labor_item = labor_item_map.get(doc.service_type)
		if labor_item:
			hours = doc.hours_worked or 0
			if doc.service_type in ("Labor Rate", "Misc") and hours > 0:
				labor_qty = hours
				labor_rate = round(doc.service_cost / hours, 4)
			else:
				labor_qty = 1
				labor_rate = doc.service_cost
			invoice_lines.append({"item_code": labor_item, "qty": labor_qty, "rate": labor_rate, "description": f"Labor — {doc.service_type}"})

	if invoice_lines:
		existing_si = frappe.db.get_value("Sales Invoice", {"custom_source_doctype": "Service Work Order", "custom_source_document": swo_name, "docstatus": ["<", 2]}, "name")
		if not existing_si:
			sinv = frappe.new_doc("Sales Invoice")
			sinv.customer = doc.customer
			sinv.company = doc.company
			sinv.posting_date = frappe.utils.today()
			if hasattr(doc, 'po_number') and doc.po_number:
				sinv.po_no = doc.po_number
			sinv.remarks = f"Generated automatically from SWO {doc.name}"
			sinv.custom_source_doctype = "Service Work Order"
			sinv.custom_source_document = swo_name
			sinv.custom_work_order_number = doc.work_order_number or swo_name
			for line in invoice_lines:
				sinv.append("items", line)
			sinv.insert(ignore_permissions=True)
			created["sales_invoice"] = sinv.name
			
	frappe.db.commit()

	# Push status forward using the canonical resolver
	from southwest.service_management.doctype.service_work_order.service_work_order import update_swo_final_status
	update_swo_final_status(swo_name)

	return created


@frappe.whitelist()
def get_pause_reason_mandatory():
	"""Returns whether a pause reason is required when pausing a Service Work Order."""
	val = frappe.db.get_single_value("Service Manager Settings", "pause_reason_mandatory")
	return {"pause_reason_mandatory": int(val or 0)}


@frappe.whitelist()
def pause_repair(swo_name, reason=None):
	"""
	Pauses a Service Work Order by transitioning it to Partial Repair.
	Mirrors the Desk flow: closes the open time log entry (sets end_time, duration,
	and description), then saves the status change.
	Validates pause reason if pause_reason_mandatory is enabled.
	"""
	from frappe.utils import now_datetime, time_diff_in_seconds

	if frappe.db.get_single_value("Service Manager Settings", "pause_reason_mandatory"):
		if not (reason or "").strip():
			frappe.throw(frappe._("Pause Reason is required to pause this work order."))

	doc = frappe.get_doc("Service Work Order", swo_name)

	# Close the open time log entry (mirrors close_last_time_log in JS)
	open_log = None
	for row in reversed(doc.time_logs or []):
		if row.start_time and not row.end_time:
			open_log = row
			break

	if open_log:
		end_time = now_datetime()
		diff_seconds = time_diff_in_seconds(end_time, open_log.start_time)
		open_log.end_time = end_time
		open_log.duration_in_hours = round(max(0, diff_seconds / 3600), 2)
		if reason:
			open_log.description = reason.strip()
		open_log.type = "Partial Repair"

	doc.status = "Partial Repair"
	doc.save(ignore_permissions=False)
	return "ok"


@frappe.whitelist()
def get_misc_default_days():
	"""Returns the misc_default_days setting for pre-populating the Next Scheduled Date field."""
	days = frappe.db.get_single_value("Service Manager Settings", "misc_default_days")
	return {"misc_default_days": int(days or 90)}


@frappe.whitelist()
def get_swo_pdf_url(name):
	"""
	Return Frappe's built-in download_pdf URL for the SWO with the configured letter head.
	Access is restricted to Staged or Completed documents.
	"""
	from urllib.parse import quote, urlencode

	doc = frappe.get_doc("Service Work Order", name)
	frappe.has_permission("Service Work Order", doc=doc, throw=True)

	if doc.status not in ("Staged", "Completed"):
		frappe.throw(frappe._("PDF download is only available for Staged or Completed work orders."))

	letter_head = frappe.db.get_single_value("Service Manager Settings", "app_pdf_letter_head") or ""

	params = urlencode({
		"doctype": "Service Work Order",
		"name": name,
		"format": "Service Work Order",
		"no_letterhead": 0 if letter_head else 1,
		"letterhead": letter_head,
		"settings": "{}",
		"_lang": "en",
		"pdf_generator": "wkhtmltopdf",
	})
	return f"/api/method/frappe.utils.print_format.download_pdf?{params}"


@frappe.whitelist()
def enqueue_swo_pdf(name):
	"""
	Validate the request and enqueue PDF generation in the RQ background worker.
	Returns a cache_key the client uses to poll for completion.

	Running wkhtmltopdf inside a gunicorn worker causes a deadlock: wkhtmltopdf
	makes HTTP requests back to gunicorn (to load CSS/assets) while the worker
	is blocked waiting for wkhtmltopdf to finish. The RQ worker is a completely
	separate process, so it can make those HTTP requests without any deadlock.
	"""
	doc = frappe.get_doc("Service Work Order", name)
	frappe.has_permission("Service Work Order", doc=doc, throw=True)

	if doc.status not in ("Staged", "Completed"):
		frappe.throw(frappe._("PDF download is only available for Staged or Completed work orders."))

	cache_key = f"swo_pdf_{frappe.generate_hash(name, 16)}"
	frappe.cache().delete_value(cache_key)

	frappe.enqueue(
		"southwest.api._generate_swo_pdf_job",
		queue="short",
		timeout=120,
		name=name,
		cache_key=cache_key,
	)
	return cache_key


def _generate_swo_pdf_job(name, cache_key):
	"""
	RQ background job: generate the PDF and store it in Redis cache.
	Runs in the worker process — no gunicorn deadlock possible.
	"""
	import base64
	try:
		letter_head = frappe.db.get_single_value("Service Manager Settings", "app_pdf_letter_head") or ""

		html = frappe.get_print(
			"Service Work Order",
			name,
			"Service Work Order",
			letterhead=letter_head or None,
			no_letterhead=not bool(letter_head),
		)

		from frappe.utils.data import scrub_urls
		from frappe.utils import get_url
		html = scrub_urls(html)
		site_url = get_url().rstrip("/")
		pdf_backend_url = frappe.conf.get("pdf_backend_url", "http://localhost:8000")
		html = html.replace(site_url, pdf_backend_url)

		from frappe.utils.pdf import get_pdf
		pdf = get_pdf(html)

		frappe.cache().set_value(
			cache_key,
			{"status": "done", "pdf_b64": base64.b64encode(pdf).decode()},
			expires_in_sec=600,
		)
	except Exception as e:
		frappe.cache().set_value(
			cache_key,
			{"status": "error", "message": str(e)},
			expires_in_sec=60,
		)


@frappe.whitelist()
def get_swo_pdf_status(cache_key):
	"""Poll whether a background PDF job has finished."""
	result = frappe.cache().get_value(cache_key)
	if not result:
		return {"status": "pending"}
	return {"status": result["status"], "message": result.get("message", "")}


@frappe.whitelist()
def download_swo_pdf(cache_key, name):
	"""Stream the generated PDF from Redis cache."""
	import base64
	result = frappe.cache().get_value(cache_key)
	if not result or result.get("status") != "done":
		frappe.throw(frappe._("PDF is not ready yet."))

	pdf = base64.b64decode(result["pdf_b64"])
	frappe.local.response.type = "pdf"
	frappe.local.response.filecontent = pdf
	frappe.local.response.filename = f"Work-Order-{name}.pdf"


@frappe.whitelist()
def stream_swo_pdf(name):
	"""
	Legacy direct-stream endpoint (kept for fallback).
	Prefer enqueue_swo_pdf to avoid the gunicorn deadlock on busy servers.
	"""
	doc = frappe.get_doc("Service Work Order", name)
	frappe.has_permission("Service Work Order", doc=doc, throw=True)

	if doc.status not in ("Staged", "Completed"):
		frappe.throw(frappe._("PDF download is only available for Staged or Completed work orders."))

	letter_head = frappe.db.get_single_value("Service Manager Settings", "app_pdf_letter_head") or ""

	html = frappe.get_print(
		"Service Work Order",
		name,
		"Service Work Order",
		letterhead=letter_head or None,
		no_letterhead=not bool(letter_head),
	)

	from frappe.utils.data import scrub_urls
	from frappe.utils import get_url
	html = scrub_urls(html)
	site_url = get_url().rstrip("/")
	pdf_backend_url = frappe.conf.get("pdf_backend_url", "http://localhost:8000")
	html = html.replace(site_url, pdf_backend_url)

	from frappe.utils.pdf import get_pdf
	pdf = get_pdf(html)

	frappe.local.response.type = "pdf"
	frappe.local.response.filecontent = pdf
	frappe.local.response.filename = f"Work-Order-{name}.pdf"
