import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def create_fields():
	create_custom_fields(get_custom_fields(), ignore_validate=True)


def delete_fields():
	for doctype, fields in get_custom_fields().items():
		frappe.db.delete(
			"Custom Field",
			{
				"fieldname": ("in", [f["fieldname"] for f in fields]),
				"dt": doctype,
			},
		)


def get_custom_fields():
	return {
		"Customer": [
			{
				"fieldname": "custom_customer_code",
				"label": _("Customer Code"),
				"fieldtype": "Data",
				"insert_after": "customer_name",
				"reqd": 1,
				"in_list_view": 1,
			},
			# Tab grouping service exception items per customer
			{
				"fieldname": "custom_service_exceptions_tab",
				"label": _("Service Exceptions"),
				"fieldtype": "Tab Break",
				"insert_after": "default_price_list",
			},
			{
				"fieldname": "custom_service_item_exceptions",
				"label": _("Service Item Exceptions"),
				"fieldtype": "Table",
				"options": "Customer Item Exception",
				"insert_after": "custom_service_exceptions_tab",
			},
		],
		"Sales Invoice": [
			{
				"fieldname": "custom_company_sequence",
				"label": _("Company Sequence"),
				"fieldtype": "Data",
				"insert_after": "naming_series",
				"read_only": 1,
				"no_copy": 1,
			},
			{
				"fieldname": "custom_source_doctype",
				"label": _("Source Document Type"),
				"fieldtype": "Link",
				"options": "DocType",
				"insert_after": "custom_company_sequence",
				"read_only": 1,
				"no_copy": 1,
				"print_hide": 1,
			},
			{
				"fieldname": "custom_source_document",
				"label": _("Source Document"),
				"fieldtype": "Dynamic Link",
				"options": "custom_source_doctype",
				"insert_after": "custom_source_doctype",
				"read_only": 1,
				"no_copy": 1,
				"print_hide": 1,
			},
			{
				"fieldname": "custom_work_order_number",
				"label": _("Work Order Number"),
				"fieldtype": "Data",
				"insert_after": "custom_source_document",
				"read_only": 1,
				"no_copy": 1,
				"print_hide": 1,
			},
		],
		"Stock Entry": [
			{
				"fieldname": "custom_source_doctype",
				"label": _("Source Document Type"),
				"fieldtype": "Data",
				"insert_after": "amended_from",
				"read_only": 1,
				"no_copy": 1,
				"hidden": 1,
			},
			{
				"fieldname": "custom_source_document",
				"label": _("Source Document"),
				"fieldtype": "Data",
				"insert_after": "custom_source_doctype",
				"read_only": 1,
				"no_copy": 1,
				"hidden": 1,
			},
			{
				"fieldname": "custom_work_order_number",
				"label": _("Work Order Number"),
				"fieldtype": "Data",
				"insert_after": "custom_source_document",
				"read_only": 1,
				"no_copy": 1,
				"print_hide": 1,
			},
		],
		"Item": [
			# Button placed right after item_code in the standard form
			{
				"fieldname": "custom_generate_code_btn",
				"label": _("Generate Code"),
				"fieldtype": "Button",
				"insert_after": "item_code",
			},
			# Section grouping the southwest-specific fields
			{
				"fieldname": "custom_southwest_section",
				"label": _(""),
				"fieldtype": "Section Break",
				"insert_after": "item_name",
			},
			# Owner type selector — determines whether the owner is a Customer or Company
			{
				"fieldname": "custom_owner_type",
				"label": _("Owner Type"),
				"fieldtype": "Select",
				"options": "\nCustomer\nCompany",
				"insert_after": "custom_southwest_section",
				"reqd": 0,
			},
			# Dynamic link — resolves to Customer or Company based on custom_owner_type
			{
				"fieldname": "custom_customer",
				"label": _("Owner"),
				"fieldtype": "Dynamic Link",
				"options": "custom_owner_type",
				"insert_after": "custom_owner_type",
				"reqd": 0,
			},
			{
				"fieldname": "custom_component",
				"label": _("Component"),
				"fieldtype": "Data",
				"insert_after": "custom_customer",
				"reqd": 0,
			},
			{
				"fieldname": "custom_part_color",
				"label": _("Part Color"),
				"fieldtype": "Data",
				"insert_after": "custom_component",
				"reqd": 0,
			},
		],
	}
