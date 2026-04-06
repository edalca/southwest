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

	return {
		"kpis": {
			"pending_assignments": pending_assignments,
			"waiting_signature": waiting_signature,
			"ready_to_invoice": ready_to_invoice,
		},
		"pending_rows": pending_rows,
	}
