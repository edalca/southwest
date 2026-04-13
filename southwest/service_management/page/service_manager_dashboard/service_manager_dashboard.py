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
		"Service Work Order", filters={"status": "Completed"}
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
		filters={"status": "Completed"},
		fields=["name", "work_order_number", "customer", "scheduled_date", "po_number"],
		order_by="scheduled_date asc"
	)

	waiting_signature_rows = frappe.db.get_all(
		"Service Work Order",
		filters={"status": "Staged"},
		fields=["name", "work_order_number", "customer", "scheduled_date", "signature_link"],
		order_by="scheduled_date asc"
	)

	# Calendar Events — last 2 months and next 2 months
	start_date = frappe.utils.add_months(frappe.utils.today(), -2)
	end_date = frappe.utils.add_months(frappe.utils.today(), 2)
	
	calendar_rows = frappe.db.get_all(
		"Service Work Order",
		filters={
			"scheduled_date": ["between", [start_date, end_date]],
			"status": ["not in", ["Cancelled"]]
		},
		fields=["name", "work_order_number", "customer", "scheduled_date", "status"]
	)

	calendar_events = []
	for r in calendar_rows:
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
