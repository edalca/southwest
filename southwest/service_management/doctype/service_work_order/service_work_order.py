import frappe
from frappe import _
from frappe.model.document import Document
from southwest.utils.sequence import get_next_sequence


class ServiceWorkOrder(Document):
	def before_save(self):
		self._open_time_log_on_start()

	def before_insert(self):
		self.work_order_number = get_next_sequence(0, 6, "Service Work Order")
		# Auto-assign the creating user as the responsible technician
		if not self.responsible_user:
			self.responsible_user = frappe.session.user

	def validate(self):
		self._validate_signature()
		self._validate_misc_next_date()
		self._recalculate_total_repair_time()
		self._calculate_service_cost()

	def on_update(self):
		self._handle_next_pm_automation()
		self._handle_next_misc_automation()
		self._check_and_submit_if_completed()

	def _check_and_submit_if_completed(self):
		"""Automatically submits the document when it reaches 'Completed' status (after signature)."""
		if self.status == "Completed" and self.docstatus == 0:
			self.submit()

	def _open_time_log_on_start(self):
		"""Appends an open Repair Session log whenever status transitions to Repairing.
		Covers both Start Repair and Resume flows."""
		if not self.has_value_changed("status") or self.status != "Repairing":
			return
		for row in (self.time_logs or []):
			if row.start_time and not row.end_time:
				return  # already has an open log
		from frappe.utils import now_datetime
		self.append("time_logs", {
			"start_time": now_datetime(),
			"type": "Repair Session",
		})

	def _validate_signature(self):
		if self.status == "Completed":
			if not self.signature_skipped and not self.customer_signature:
				frappe.throw(_("Customer Signature is required to complete the work order."))

	def _validate_misc_next_date(self):
		"""Require next_scheduled_date when a Misc order transitions to Staged."""
		if (
			self.service_type == "Misc"
			and self.has_value_changed("status")
			and self.status == "Staged"
			and not self.next_scheduled_date
		):
			frappe.throw(_("Next Scheduled Date is required to finish a Misc work order."))

	def _recalculate_total_repair_time(self):
		total = sum(row.duration_in_hours or 0 for row in (self.time_logs or []))
		self.total_repair_time = round(total, 2)

	def _handle_next_pm_automation(self):
		"""
		Automates the creation of the next Preventive Maintenance (PM) work order
		based on the trigger configured in Service Manager Settings.

		Rules:
		- Applies ONLY to 'PM Frequency' service type.
		- Triggered only once per document (next_pm_generated = 1).
		- Calculates next_date by adding pm_frequency (from active assignment).
		"""
		if self.service_type != "PM Frequency" or self.next_pm_generated:
			return

		# ─── Load configuration ──────────────────────────────────────────────────
		settings = frappe.get_single("Service Manager Settings")
		trigger = settings.next_pm_generation_trigger or "On Start Repair"

		# ─── Detection logic ─────────────────────────────────────────────────────
		if not self.has_value_changed("status"):
			return

		# ─── Check triggers ──────────────────────────────────────────────────────
		should_generate = False
		if trigger == "On Start Repair" and self.status == "Repairing":
			should_generate = True
		elif trigger == "On Finish Repair" and self.status == "Staged":
			should_generate = True

		if not should_generate:
			return

		# ─── Resolve next date ───────────────────────────────────────────────────
		if not self.equipment_selection or not self.equipment_selection[0].equipment:
			return

		equipment = self.equipment_selection[0].equipment
		ref_date = self.scheduled_date or frappe.utils.today()

		frequency = frappe.db.get_value(
			"Service Equipment Assignment",
			{
				"equipment": equipment,
				"customer": self.customer,
				"status": "Active",
				"valid_from": ["<=", ref_date],
			},
			"pm_frequency",
			order_by="valid_from desc",
		)

		if not frequency:
			# If no specific frequency found in assignment, fallback to 90 days
			frequency = 90

		next_date = frappe.utils.add_days(ref_date, frequency)

		# ─── Create Next Order ───────────────────────────────────────────────────
		create_programmed_order(self.name, next_date)

		# Set flag on current doc using db_set to avoid re-triggering save logic
		self.db_set("next_pm_generated", 1)
		frappe.msgprint(
			_("Next PM Work Order has been automatically generated for {0}.").format(next_date),
			alert=True,
		)

	def _handle_next_misc_automation(self):
		"""
		Creates the next Misc work order when status transitions to Staged,
		using next_scheduled_date provided by the technician via the mobile app.

		Rules:
		- Applies ONLY to 'Misc' service type.
		- Requires next_scheduled_date to be set (validated in _validate_misc_next_date).
		- Runs only when status changes to 'Staged'.
		"""
		if self.service_type != "Misc" or not self.next_scheduled_date:
			return
		if not self.has_value_changed("status") or self.status != "Staged":
			return

		create_programmed_order(self.name, self.next_scheduled_date)
		frappe.msgprint(
			_("Next Misc Work Order has been automatically scheduled for {0}.").format(
				self.next_scheduled_date
			),
			alert=True,
		)

	def get_service_type_display(self):
		"""Returns a formatted service type string for print formats.

		If self.service_type is listed in Service Manager Settings →
		print_equipment_type_for, the unique equipment types from
		equipment_selection are appended.

		Examples:
		  'Misc'          → 'Misc - Truck / Door'   (when Misc is configured)
		  'PM Frequency'  → 'PM Frequency'           (when not configured)
		"""
		if not self.service_type:
			return ""

		configured = frappe.get_all(
			"Service Type Config",
			filters={"parent": "Service Manager Settings", "parentfield": "print_equipment_type_for"},
			pluck="service_type",
		)

		if self.service_type not in configured:
			return self.service_type

		types = []
		for row in self.equipment_selection or []:
			if not row.equipment:
				continue
			eq_type = frappe.get_cached_value("Equipment", row.equipment, "equipment_type")
			if eq_type and eq_type not in types:
				types.append(eq_type)

		if not types:
			return self.service_type

		return "{} - {}".format(self.service_type, " / ".join(types))

	def _calculate_service_cost(self):
		if not self.equipment_selection or not self.service_type:
			self.service_cost = 0
			return

		ref_date = self.scheduled_date or frappe.utils.today()
		first_equipment = self.equipment_selection[0].equipment

		if not first_equipment:
			self.service_cost = 0
			return

		assignments = frappe.db.sql(
			"""
			SELECT name, pm_price_per_visit, equipment_labor_rate, service_contract
			FROM `tabService Equipment Assignment`
			WHERE equipment = %(equipment)s
				AND customer = %(customer)s
				AND status = 'Active'
				AND valid_from <= %(ref_date)s
				AND (valid_to IS NULL OR valid_to >= %(ref_date)s)
			ORDER BY valid_from DESC
			LIMIT 1
			""",
			{"equipment": first_equipment, "customer": self.customer, "ref_date": ref_date},
			as_dict=True,
		)

		if not assignments:
			self.service_cost = 0
			return

		assignment = assignments[0]

		if self.service_type == "PM Frequency":
			self.service_cost = assignment.pm_price_per_visit or 0

		elif self.service_type == "Labor Rate":
			contract = frappe.get_doc("Service Contract", assignment.service_contract)
			labor_rate = assignment.equipment_labor_rate or contract.labor_rate or 0
			self.service_cost = round((self.hours_worked or 0) * labor_rate, 2)

		elif self.service_type == "Misc":
			contract = frappe.get_doc("Service Contract", assignment.service_contract)
			misc_rate = contract.misc_rate or 0
			self.service_cost = round((self.hours_worked or 0) * misc_rate, 2)

		else:
			self.service_cost = 0


@frappe.whitelist()
def get_valid_equipment_for_customer(doctype, txt, searchfield, start, page_len, filters):
	"""
	Custom search query for the equipment field inside the Service Work Order Equipment
	child table. Returns only equipment that has an active Service Equipment Assignment
	for the given customer on the given reference date.
	"""
	import json

	if isinstance(filters, str):
		filters = json.loads(filters)

	customer = (filters or {}).get("customer")
	ref_date = (filters or {}).get("ref_date") or frappe.utils.today()

	if not customer:
		return []

	txt_match = f"%{txt}%"

	return frappe.db.sql(
		"""
		SELECT DISTINCT e.name, e.customer_unit_id_number
		FROM `tabEquipment` e
		INNER JOIN `tabService Equipment Assignment` a
			ON a.equipment = e.name
			AND a.customer = %(customer)s
			AND a.status = 'Active'
			AND a.valid_from <= %(ref_date)s
			AND (a.valid_to IS NULL OR a.valid_to >= %(ref_date)s)
		WHERE e.customer = %(customer)s
			AND (
				e.name LIKE %(txt)s
				OR e.customer_unit_id_number LIKE %(txt)s
			)
		LIMIT %(start)s, %(page_len)s
		""",
		{
			"customer": customer,
			"ref_date": ref_date,
			"txt": txt_match,
			"start": int(start),
			"page_len": int(page_len),
		},
	)


@frappe.whitelist()
def generate_signature_link(doc_name, frontend_base_url=None):
	"""
	Generates a unique token, builds a public signature URL pointing to the
	mobile frontend app, saves both on the SWO, and returns the URL.

	frontend_base_url: origin of the Ionic frontend (e.g. http://localhost:8100).
	Falls back to the Frappe site URL when not provided.
	"""
	import hashlib
	import os

	token = hashlib.sha256(os.urandom(32)).hexdigest()

	if frontend_base_url:
		# Dev: caller passes the Vite dev server origin, router runs at "/"
		base = frontend_base_url.rstrip("/")
		path = "/signature"
	else:
		# Production: derive origin from the incoming request so reverse proxies
		# (ngrok, nginx) are respected instead of using the internal site URL.
		try:
			proto = (
				frappe.local.request.headers.get("X-Forwarded-Proto")
				or frappe.local.request.scheme
				or "https"
			)
			host = (
				frappe.local.request.headers.get("X-Forwarded-Host")
				or frappe.local.request.host
			)
			base = f"{proto}://{host}"
		except Exception:
			base = frappe.utils.get_url().rstrip("/")
		path = "/southwest/signature"

	link = f"{base}{path}?token={token}"

	frappe.db.set_value(
		"Service Work Order",
		doc_name,
		{"signature_token": token, "signature_link": link},
	)
	frappe.db.commit()
	return link


@frappe.whitelist(allow_guest=True)
def get_guest_csrf_token():
	"""Returns the CSRF token for the current guest session."""
	return frappe.local.session.data.csrf_token


@frappe.whitelist(allow_guest=True)
def get_signature_page_data(token):
	"""
	Returns all data needed to render the signature page.
	No authentication required — token acts as the credential.
	"""
	if not token:
		frappe.throw(_("Invalid token."), frappe.AuthenticationError)

	doc_name = frappe.db.get_value("Service Work Order", {"signature_token": token, "docstatus": ["<", 2]}, "name")
	if not doc_name:
		return {"expired": True}

	doc = frappe.get_doc("Service Work Order", doc_name)
	if doc.status != "Staged":
		return {"already_signed": True}

	# ── Company info ─────────────────────────────────────────────────────────
	company_name = frappe.db.get_default("company") or ""
	company_doc = frappe.get_doc("Company", company_name) if company_name else None
	company_logo = getattr(company_doc, "company_logo", "") or ""
	company_phone = getattr(company_doc, "phone_no", "") or ""
	company_email = getattr(company_doc, "email", "") or ""
	company_address = getattr(company_doc, "address_html", "") or ""

	# ── Customer address ──────────────────────────────────────────────────────
	customer_address = ""
	addr_name = frappe.db.get_value(
		"Dynamic Link",
		{"link_doctype": "Customer", "link_name": doc.customer, "parenttype": "Address"},
		"parent",
	)
	if addr_name:
		addr = frappe.get_doc("Address", addr_name)
		parts = [p for p in [addr.address_line1, addr.city, addr.state, addr.pincode] if p]
		customer_address = ", ".join(parts)

	# ── Equipment ─────────────────────────────────────────────────────────────
	equipment_rows = []
	for sel in doc.equipment_selection or []:
		if not sel.equipment:
			continue
		eq = frappe.get_doc("Equipment", sel.equipment)
		equipment_rows.append(
			{
				"make": eq.make or "",
				"model": eq.model or "",
				"serial_no": eq.serial_no or "",
				"unit": eq.customer_unit_id_number or "",
			}
		)

	# ── Service items ─────────────────────────────────────────────────────────
	service_items = []
	for row in doc.service_items or []:
		service_items.append(
			{
				"label": row.item_code or row.part_number or "",
				"description": row.description or "",
				"qty": row.qty or 0,
			}
		)

	return {
		"expired": False,
		"already_signed": False,
		"company_name": company_name,
		"company_logo": company_logo,
		"company_phone": company_phone,
		"company_email": company_email,
		"company_address": company_address,
		"work_order_number": doc.work_order_number or doc.name,
		"customer": doc.customer,
		"customer_address": customer_address,
		"service_type": doc.service_type or "",
		"scheduled_date": str(doc.scheduled_date or ""),
		"po_number": getattr(doc, "po_number", "") or "",
		"hour_meter": doc.hour_meter or "",
		"total_repair_time": doc.total_repair_time or 0,
		"problem_with_lift": doc.problem_with_lift or "",
		"repair_description": doc.repair_description or "",
		"equipment_rows": equipment_rows,
		"service_items": service_items,
		"allow_skip_signature": frappe.db.get_single_value("Service Manager Settings", "allow_skip_signature") or 0,
	}


@frappe.whitelist()
def update_swo_final_status(swo_name):
	"""
	Analyzes related Sales Invoice and Stock Entry records to determine the
	administrative status of a submitted Service Work Order.
	Statuses:
	  - Billed: Invoice exists but Stock Entry is pending (if required).
	  - Issued: Stock Entry exists but Invoice is pending.
	  - Closed: Both completed, or Invoice completed and no stock required.
	"""
	doc = frappe.get_doc("Service Work Order", swo_name)
	if doc.docstatus != 1:
		return

	# Check for Sales Invoice
	has_invoice = frappe.db.exists(
		"Sales Invoice",
		{
			"custom_source_doctype": "Service Work Order",
			"custom_source_document": swo_name,
			"docstatus": 1,
		},
	)

	# Check if Stock Entry is required (based on exceptions)
	exception_codes = _get_exception_item_codes(doc.customer, doc.service_type)
	requires_stock = False
	if exception_codes:
		for item in doc.service_items or []:
			if item.item_code in exception_codes:
				requires_stock = True
				break

	# Check for Stock Entry
	has_stock = frappe.db.exists(
		"Stock Entry",
		{
			"custom_source_doctype": "Service Work Order",
			"custom_source_document": swo_name,
			"docstatus": 1,
		},
	)

	new_status = doc.status
	if has_invoice and (has_stock or not requires_stock):
		new_status = "Closed"
	elif has_invoice:
		new_status = "Billed"
	elif has_stock:
		new_status = "Issued"

	if new_status != doc.status:
		doc.db_set("status", new_status)
		frappe.msgprint(_("Work Order {0} status updated to {1}.").format(swo_name, new_status), alert=True)

	return new_status


@frappe.whitelist(allow_guest=True)
def submit_signature(token, signature=None, skipped=0, paper_signature=None):
	"""
	Called from the public signature web page. Validates the token, saves the
	customer signature (or paper attachment), advances the status to Completed,
	and clears the token/link.
	No authentication required — the token acts as the credential.
	"""
	if not token:
		frappe.throw(_("Token is required."))

	if not skipped and not signature:
		frappe.throw(_("Signature is required."))

	doc_name = frappe.db.get_value("Service Work Order", {"signature_token": token}, "name")
	if not doc_name:
		frappe.throw(_("This signature link is invalid or has already been used."))

	doc = frappe.get_doc("Service Work Order", doc_name)
	if doc.status != "Staged":
		frappe.throw(_("This work order is no longer awaiting a signature."))

	if skipped:
		doc.signature_skipped = 1
		# Save base64 as file
		from frappe.utils.file_manager import save_file
		import base64

		file_name = f"paper_sig_{doc.name}.png"
		if "," in paper_signature:
			paper_signature = paper_signature.split(",")[1]

		file_content = base64.b64decode(paper_signature)
		saved_file = save_file(file_name, file_content, "Service Work Order", doc.name, is_private=0)
		doc.paper_signature_attachment = saved_file.file_url
	else:
		doc.customer_signature = signature
		doc.signature_skipped = 0

	doc.signature_date = frappe.utils.now_datetime()
	doc.status = "Completed"
	doc.signature_token = ""
	doc.signature_link = ""
	doc.save(ignore_permissions=True)

	_create_part_assignments(doc)

	frappe.db.commit()
	return {"success": True, "doc_name": doc_name}


@frappe.whitelist()
def reset_signature(doc_name):
	"""
	Resets the signature status of a Service Work Order, allowing it to be signed again.
	Clears signature, skipped flag, and attachment.
	"""
	doc = frappe.get_doc("Service Work Order", doc_name)
	doc.customer_signature = None
	doc.signature_date = None
	doc.signature_skipped = 0
	doc.paper_signature_attachment = None
	doc.status = "Staged"
	doc.save()
	frappe.db.commit()
	return True


@frappe.whitelist()
def desk_skip_signature(doc_name, paper_signature):
	"""
	Allows internal staff to skip a signature from the Desk by uploading a file.
	"""
	doc = frappe.get_doc("Service Work Order", doc_name)
	if doc.status != "Staged":
		frappe.throw(_("Work order must be in Staged status to skip signature."))

	doc.signature_skipped = 1
	doc.signature_date = frappe.utils.now_datetime()

	# Handle base64 if provided, or assume it's already a file URL if passed from Desk
	if paper_signature.startswith("data:"):
		from frappe.utils.file_manager import save_file
		import base64
		file_name = f"paper_sig_desk_{doc.name}.png"
		header, data = paper_signature.split(",")
		file_content = base64.b64decode(data)
		saved_file = save_file(file_name, file_content, "Service Work Order", doc.name, is_private=0)
		doc.paper_signature_attachment = saved_file.file_url
	else:
		doc.paper_signature_attachment = paper_signature

	doc.status = "Completed"
	doc.signature_token = ""
	doc.signature_link = ""
	doc.save()

	from southwest.service_management.doctype.service_work_order.service_work_order import _create_part_assignments
	_create_part_assignments(doc)

	frappe.db.commit()
	return True


@frappe.whitelist()
def change_responsible_user(doc_name, new_user):
	"""
	Updates the responsible_user field on a Service Work Order.
	Called from the Desk 'Change Responsible' action dialog.
	"""
	if not doc_name or not new_user:
		frappe.throw(_("Document name and new user are required."))

	if not frappe.db.exists("User", {"name": new_user, "enabled": 1}):
		frappe.throw(_("User {0} does not exist or is disabled.").format(new_user))

	frappe.db.set_value("Service Work Order", doc_name, "responsible_user", new_user)
	frappe.db.commit()


@frappe.whitelist()
def update_po_number(doc_name, po_number):
	"""Updates the PO Number on any saved or submitted work order."""
	frappe.db.set_value("Service Work Order", doc_name, "po_number", po_number)
	frappe.db.commit()


@frappe.whitelist()
def complete_work_order(doc_name, signature):
	"""
	Sets customer_signature, moves status to Completed, and creates
	Service Part Assignment records for any non-inventory parts that
	need to be mapped to an Item before invoicing.
	"""
	if not signature:
		frappe.throw(_("Customer Signature is required to complete the work order."))

	doc = frappe.get_doc("Service Work Order", doc_name)
	doc.customer_signature = signature
	doc.signature_date = frappe.utils.now_datetime()
	doc.status = "Completed"
	doc.save(ignore_permissions=True)

	_create_part_assignments(doc)

	frappe.db.commit()
	return doc.name




def _create_part_assignments(doc):
	"""
	For each service_items row with is_non_inventory_part = 1,
	create a Service Part Assignment (status=Pending) if one does not already exist.
	"""
	for row in doc.service_items or []:
		if not row.is_non_inventory_part:
			continue
		exists = frappe.db.exists(
			"Service Part Assignment",
			{"service_work_order": doc.name, "swo_row_name": row.name},
		)
		if not exists:
			assignment = frappe.get_doc(
				{
					"doctype": "Service Part Assignment",
					"service_work_order": doc.name,
					"swo_row_name": row.name,
					"part_number": row.part_number or "",
					"description": row.description or "",
					"qty": row.qty or 1,
					"status": "Pending",
				}
			)
			assignment.insert(ignore_permissions=True)


@frappe.whitelist()
def create_programmed_order(source_name, next_date):
	"""
	Creates the next programmed Service Work Order from a completed one.
	Only copies: Customer, Company, Equipment, Service Type, and Scheduled Date.
	PO Number is fetched fresh from the customer's active PO assignment.
	No items, hours, descriptions, logs, or signatures are carried over.
	"""
	source = frappe.get_doc("Service Work Order", source_name)

	active_po = frappe.db.get_value(
		"Customer PO Assignment",
		{"customer": source.customer, "is_active": 1, "valid_from": ["<=", frappe.utils.today()]},
		"po_number",
		order_by="valid_from desc",
	)

	new_doc = frappe.get_doc({
		"doctype": "Service Work Order",
		"status": "Programmed",
		"customer": source.customer,
		"company": source.company,
		"service_type": source.service_type,
		"scheduled_date": next_date,
		"po_number": active_po or "",
		"previous_work_order": source_name,
		"equipment_selection": [
			{"equipment": row.equipment}
			for row in (source.equipment_selection or [])
			if row.equipment
		],
	})
	new_doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return new_doc.name


def _get_exception_item_codes(customer, service_type):
	"""
	Returns the set of item_codes that are covered by the customer's service
	exception table for the given service_type.
	"""
	exception_flag_map = {
		"PM Frequency": "pm_frequency",
		"Misc": "misc",
		"Labor Rate": "labor_rate",
	}
	flag = exception_flag_map.get(service_type)
	if not flag:
		return set()

	rows = frappe.get_all(
		"Customer Item Exception",
		filters={
			"parent": customer,
			"parentfield": "custom_service_item_exceptions",
			flag: 1,
		},
		fields=["item_code"],
	)
	return {r.item_code for r in rows if r.item_code}


@frappe.whitelist()
def create_stock_entry(doc_name):
	"""
	Creates a draft Stock Entry for items covered by the customer's service
	exception table for this SWO's service type. These items are written off
	from inventory instead of being billed on the Sales Invoice.

	Available at Staged or Completed status. Throws if an active stock entry
	already exists for this SWO.
	"""
	doc = frappe.get_doc("Service Work Order", doc_name)

	# ── Guard: duplicate stock entry ──────────────────────────────────────────
	existing = frappe.db.get_value(
		"Stock Entry",
		{
			"custom_source_doctype": "Service Work Order",
			"custom_source_document": doc_name,
			"docstatus": ["<", 2],
		},
		"name",
	)
	if existing:
		frappe.throw(
			_("A Stock Entry ({0}) already exists for this work order.").format(existing)
		)

	# ── Resolve exception items ───────────────────────────────────────────────
	exception_codes = _get_exception_item_codes(doc.customer, doc.service_type)
	if not exception_codes:
		frappe.throw(
			_("No service exception items are configured for this customer and service type.")
		)

	# ── Match exception items against SWO service items ───────────────────────
	items_to_write_off = []
	for row in doc.service_items or []:
		if row.item_code and row.item_code in exception_codes:
			items_to_write_off.append({"item_code": row.item_code, "qty": row.qty or 1})

	if not items_to_write_off:
		frappe.throw(
			_("None of the items in this work order match the customer's service exceptions.")
		)

	# ── Stock Entry Type from settings ────────────────────────────────────────
	settings = frappe.get_single("Service Manager Settings")
	entry_type = settings.default_swo_stock_entry_type or "Material Issue"

	default_warehouse = (
		frappe.db.get_value("Company", doc.company, "default_inventory_account")
		or frappe.db.get_default("default_warehouse")
		or ""
	)

	se = frappe.get_doc(
		{
			"doctype": "Stock Entry",
			"stock_entry_type": entry_type,
			"company": doc.company,
			"custom_source_doctype": "Service Work Order",
			"custom_source_document": doc_name,
			"custom_work_order_number": doc.work_order_number or doc_name,
			"items": [
				{
					"item_code": line["item_code"],
					"qty": line["qty"],
					"s_warehouse": default_warehouse,
				}
				for line in items_to_write_off
			],
		}
	)
	se.insert(ignore_permissions=True)
	frappe.db.commit()
	return se.name


@frappe.whitelist()
def resolve_and_create_invoice(doc_name):
	"""
	Creates a draft Sales Invoice from a Completed Service Work Order.

	Rules:
	  - Throws if a non-cancelled invoice already exists for this SWO.
	  - Throws if any Service Part Assignment for this SWO is still Pending.
	  - Items covered by the customer's service exception table for this
	    service type are excluded from the invoice (they go to a Stock Entry
	    via the separate 'Create Stock Entry' action).
	  - Appends a labor line from Service Manager Settings based on service_type.
	"""
	doc = frappe.get_doc("Service Work Order", doc_name)

	# ── Guard: duplicate invoice ──────────────────────────────────────────────
	existing = frappe.db.get_value(
		"Sales Invoice",
		{
			"custom_source_doctype": "Service Work Order",
			"custom_source_document": doc_name,
			"docstatus": ["<", 2],
		},
		"name",
	)
	if existing:
		frappe.throw(
			_("A Sales Invoice ({0}) already exists for this work order.").format(existing)
		)

	# ── Guard: pending part assignments ──────────────────────────────────────
	pending = frappe.db.get_all(
		"Service Part Assignment",
		filters={"service_work_order": doc_name, "status": "Pending"},
		fields=["name", "part_number", "description"],
	)
	if pending:
		names = ", ".join(p.part_number or p.description or p.name for p in pending)
		frappe.throw(
			_("The following parts still need an Item assigned before invoicing: {0}").format(names)
		)

	# ── Resolve exception items (excluded from invoice) ───────────────────────
	exception_codes = _get_exception_item_codes(doc.customer, doc.service_type)

	# ── Collect billable items ─────────────────────────────────────────────────
	# Inventory rows (item_code set directly on SWO item, not in exception list)
	inventory_rows = [
		r
		for r in doc.service_items
		if not r.is_non_inventory_part and r.item_code and r.item_code not in exception_codes
	]
	# Resolved non-inventory rows from Part Assignments (also exclude exceptions)
	part_assignments = frappe.get_all(
		"Service Part Assignment",
		filters={"service_work_order": doc_name, "status": "Assigned"},
		fields=["item_code", "qty", "description", "part_number", "swo_row_name"],
	)

	# ── Build invoice lines ────────────────────────────────────────────────────
	invoice_lines = []

	def _add_invoice_line(item_code, qty, description):
		sale_price = (
			frappe.db.get_value(
				"Item Price",
				{"item_code": item_code, "selling": 1},
				"price_list_rate",
			)
			or 0
		)
		invoice_lines.append(
			{"item_code": item_code, "qty": qty, "rate": sale_price, "description": description}
		)

	for row in inventory_rows:
		_add_invoice_line(row.item_code, row.qty or 1, row.description or "")

	for pa in part_assignments:
		if pa.item_code and pa.item_code not in exception_codes:
			_add_invoice_line(pa.item_code, pa.qty or 1, pa.description or pa.part_number or "")

	# ── Sales Invoice ─────────────────────────────────────────────────────────
	sinv = frappe.new_doc("Sales Invoice")
	sinv.customer = doc.customer
	sinv.company = doc.company
	sinv.posting_date = frappe.utils.today()
	if getattr(doc, "po_number", None):
		sinv.po_no = doc.po_number
	sinv.remarks = _("Generated from Service Work Order {0}").format(doc.name)
	sinv.custom_source_doctype = "Service Work Order"
	sinv.custom_source_document = doc_name
	sinv.custom_work_order_number = doc.work_order_number or doc_name

	for line in invoice_lines:
		sinv.append("items", line)

	# ── Labor line from Service Manager Settings ──────────────────────────────
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
				# qty = hours worked, rate = hourly rate
				labor_qty = hours
				labor_rate = round(doc.service_cost / hours, 4)
			else:
				# PM Frequency: flat price per visit
				labor_qty = 1
				labor_rate = doc.service_cost

			sinv.append(
				"items",
				{
					"item_code": labor_item,
					"qty": labor_qty,
					"rate": labor_rate,
					"description": doc.repair_description or _("Labor — {0}").format(doc.service_type),
				},
			)

	sinv.insert(ignore_permissions=True)
	frappe.db.commit()
	return sinv.name
