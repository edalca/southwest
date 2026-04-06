import frappe


@frappe.whitelist()
def get_technician_swos():
	"""
	Return Service Work Orders owned by the current session user.
	Used by the mobile frontend to show only the technician's own work orders.
	"""
	return frappe.get_list(
		"Service Work Order",
		filters={"owner": frappe.session.user, "status": ["!=", "Invoiced"]},
		fields=[
			"name",
			"work_order_number",
			"status",
			"customer",
			"scheduled_date",
			"service_type",
		],
		order_by="scheduled_date desc",
		limit=50,
	)


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


@frappe.whitelist()
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
