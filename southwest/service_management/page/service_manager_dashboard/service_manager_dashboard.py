import frappe


@frappe.whitelist()
def get_dashboard_data():
	"""
	Returns all data needed to render the Service Manager Dashboard in a single
	server round-trip: three KPI counts and the ten most recent pending part
	assignment rows.
	"""
	pending_assignments = frappe.db.count(
		"Service Part Assignment", filters={"status": "Pending"}
	)
	waiting_signature = frappe.db.count(
		"Service Work Order", filters={"status": "Staged"}
	)
	ready_to_invoice = frappe.db.count(
		"Service Work Order", filters={"status": ["in", ["Completed", "Billed", "Issued"]]}
	)

	pending_rows = frappe.db.get_all(
		"Service Part Assignment",
		filters={"status": "Pending"},
		fields=["name", "service_work_order", "part_number", "description", "qty"],
		order_by="creation desc",
		limit=10,
	)

	# Fetch scheduled_date from parent SWO
	for row in pending_rows:
		if row.get("service_work_order"):
			row["scheduled_date"] = frappe.db.get_value(
				"Service Work Order", row.service_work_order, "scheduled_date"
			)
		else:
			row["scheduled_date"] = None
			
	ready_to_invoice_rows = frappe.db.get_all(
		"Service Work Order",
		filters={"status": ["in", ["Completed", "Billed", "Issued"]]},
		fields=["name", "work_order_number", "customer", "scheduled_date", "po_number", "status"],
		order_by="scheduled_date asc"
	)

	# Attach linked Sales Invoice and Stock Entry names (non-cancelled) to each row
	for row in ready_to_invoice_rows:
		row["sales_invoice"] = frappe.db.get_value(
			"Sales Invoice",
			{
				"custom_source_doctype": "Service Work Order",
				"custom_source_document": row.name,
				"docstatus": ["<", 2],
			},
			"name",
		) or ""
		row["stock_entry"] = frappe.db.get_value(
			"Stock Entry",
			{
				"custom_source_doctype": "Service Work Order",
				"custom_source_document": row.name,
				"docstatus": ["<", 2],
			},
			"name",
		) or ""

	waiting_signature_rows = frappe.db.get_all(
		"Service Work Order",
		filters={"status": "Staged"},
		fields=["name", "work_order_number", "customer", "scheduled_date", "signature_link"],
		order_by="scheduled_date asc"
	)

	# Calendar Events — dynamics range from settings
	settings = frappe.get_single("Service Manager Settings")
	months_before = settings.calendar_months_before or 2
	months_after = settings.calendar_months_after or 2

	start_date = frappe.utils.add_months(frappe.utils.today(), -months_before)
	end_date = frappe.utils.add_months(frappe.utils.today(), months_after)
	
	calendar_rows = frappe.db.get_all(
		"Service Work Order",
		filters={
			"scheduled_date": ["between", [start_date, end_date]],
			"status": ["in", ["New", "Programmed", "Repairing", "Partial Repair", "Staged", "Completed", "Billed", "Issued", "Closed", "Cancelled"]]
		},
		fields=["name", "work_order_number", "customer", "scheduled_date", "status"]
	)

	calendar_events = []
	for r in calendar_rows:
		if not r.scheduled_date:
			continue

		title = f"{r.work_order_number or r.name} - {r.customer}"
		calendar_events.append({
			"id": r.name,
			"title": title,
			"start": str(r.scheduled_date),
			"status": r.status
		})

	return {
		"kpis": {
			"pending_assignments": pending_assignments,
			"waiting_signature": waiting_signature,
			"ready_to_invoice": ready_to_invoice,
		},
		"pending_rows": pending_rows,
		"ready_to_invoice_rows": ready_to_invoice_rows,
		"waiting_signature_rows": waiting_signature_rows,
		"calendar_events": calendar_events,
	}


@frappe.whitelist()
def get_customer_po_summary():
	"""
	Returns a list of all customers with their ID, Name, and current active PO.
	Used by the PO Assignments tab in the dashboard.
	"""
	customers = frappe.db.get_all(
		"Customer",
		fields=["name", "customer_name"],
		order_by="customer_name asc"
	)

	# Fetch all active PO assignments in one go to cross-reference
	active_assignments = frappe.db.get_all(
		"Customer PO Assignment",
		filters={"is_active": 1},
		fields=["customer", "po_number"]
	)

	# Map for fast lookup
	po_map = {d.customer: d.po_number for d in active_assignments}

	summary = []
	for c in customers:
		summary.append({
			"customer_id": c.name,
			"customer_name": c.customer_name,
			"active_po": po_map.get(c.name) or ""
		})

	return summary
