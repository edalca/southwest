import frappe
from frappe import _


def execute():
	_ensure_column()

	invoices = frappe.db.get_all(
		"Sales Invoice",
		filters={
			"custom_source_doctype": "Service Work Order",
			"custom_source_document": ["!=", ""],
		},
		fields=["name", "custom_source_document"],
	)

	for inv in invoices:
		if frappe.db.get_value("Sales Invoice", inv.name, "custom_service_type"):
			continue
		service_type = frappe.db.get_value(
			"Service Work Order", inv.custom_source_document, "service_type"
		)
		if service_type:
			frappe.db.set_value("Sales Invoice", inv.name, "custom_service_type", service_type)


def _ensure_column():
	"""
	Patches run before after_migrate, so the custom field may not exist yet.
	Create it here if missing so the backfill query doesn't fail.
	"""
	if frappe.db.has_column("Sales Invoice", "custom_service_type"):
		return

	from frappe.custom.doctype.custom_field.custom_field import create_custom_field

	create_custom_field(
		"Sales Invoice",
		{
			"fieldname": "custom_service_type",
			"label": _("Service Type"),
			"fieldtype": "Data",
			"insert_after": "custom_po_number",
			"read_only": 1,
			"no_copy": 1,
			"in_list_view": 1,
			"print_hide": 1,
		},
	)
	frappe.db.commit()
